import { Router } from "express";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import AssignAccess from "../models/AssignAccess.js";
import Tutor from "../models/Tutor.js";
import ClassAccess from "../models/ClassAccess.js";
import Student from "../models/Student.js";
import User from "../models/User.js";

const assignmentRouter = new Router();

//CREATES NEW ASSIGNMENT
assignmentRouter.post("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    let { body } = req;

    const tutor = await Tutor.findOne({ userId: userId });
    if (tutor) {
      const assignmentBody = { ...body, tutorId: tutor._id, status: "private" };
      body = assignmentBody;
    } else {
      return res
        .status(400)
        .json({ message: `Tutor not found with id ${userId}` });
    }
    const newAssignment = await Assignment.create(body);
    if (newAssignment) {
      res.status(201).json(newAssignment);
    } else {
      res.status(400).json({ message: "Error creating new assignment" });
    }
  } catch (err) {
    next(err);
  }
});

//GETS ALL ASSIGNMENTS
assignmentRouter.get("/", async (req, res, next) => {
  try {
    const assignments = await Assignment.find();
    if (assignments) {
      res.json({ assignments });
    } else {
      res.json({ message: "No assignments found" });
    }
  } catch (err) {
    next(error);
  }
});

//GETS SPECIFIC ASSIGNMENT
assignmentRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    if (assignment) {
      res.json(assignment);
    } else {
      res.json({ message: `No assignment found with id: ${id}` });
    }
  } catch (err) {
    next(err);
  }
});

//GETS ALL ASSIGNMENTS BASED ON CLASS
assignmentRouter.get("/class/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignments = await Assignment.find({ classId: id });
    if (assignments) {
      res.json({ assignments });
    } else {
      res.json({ message: "No assignments found" });
    }
  } catch (err) {
    next(err);
  }
});

//GET ALL ASSIGNMENTS BASED ON TUTOR
assignmentRouter.get("/tutor/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const tutor = await Tutor.findOne({ userId: id });
    const assignments = await Assignment.find({ tutorId: tutor._id });
    if (assignments) {
      res.json(assignments);
    } else {
      res.json({ message: "No assignments found" });
    }
  } catch (err) {
    next(err);
  }
});

//GET ALL ASSIGNMENTS BASED ON STUDENT
assignmentRouter.get("/student/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await Student.findOne({ userId: id });
    const assignmentAccessList = await AssignAccess.find({
      studentId: student._id,
    });
    const assignments = [];
    for (const access of assignmentAccessList) {
      /**
       * By default mongoose queries return an instance of document class
       * Lean function tells mongoose to skip instantiating mongoose document and keep it plain JS object this allows to dynamically add new properties
       */
      const assignment = await Assignment.findOne({
        _id: access.assignmentId,
      }).lean();
      if (assignment) {
        assignment.accessLevel = access.accessLevel;
        assignments.push(assignment);
      }
    }
    if (assignments) {
      res.json(assignments);
    } else {
      res.json({ message: "No assignments found" });
    }
  } catch (err) {
    next(err);
  }
});

//GET ALL SUBMISSIONS BASED ON ASSIGNMENT
assignmentRouter.get("/submissions/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    if (assignment) {
      const uSubmissions = [];
      const submissions = assignment.submissions;
      for (let x = 0; x < submissions.length; x++) {
        const submission = {};
        const student = await Student.findById(submissions[x].studentId);
        const user = await User.findById(student.userId);
        submission.studName = user.firstName + " " + user.lastName;
        submission.submittedDate =
          submissions[x].submittedDate.toLocaleDateString();
        submission._id = submissions[x]._id;
        uSubmissions.push(submission);
      }
      res.json(uSubmissions);
    } else {
      res.json({ message: "No assignments found" });
    }
  } catch (err) {
    next(err);
  }
});

//UPDATES ASSIGNMENT'S SUBMISSIONS LIST
assignmentRouter.patch("/submit", async (req, res, next) => {
  try {
    const { body } = req;
    console.log(`BODY: ${body}`);
    const assignment = await Assignment.findById(body.assignmentId);
    const student = await Student.findOne({ userId: body.id });
    const submissionInf = {
      answers: body.answers,
      studentId: student._id,
      assignmentId: body.assignmentId,
      classId: body.classId,
    };
    if (!assignment) {
      res.status(404).json({ message: `Project not found: ${id}` });
    }
    const submission = await Submission.create(submissionInf);

    if (submission) {
      assignment.submissions.push(submission);
      await assignment.save();
      const assignmentAccess = await AssignAccess.findOne({
        assignmentId: body.assignmentId,
      });
      assignmentAccess.accessLevel = "view";
      await assignmentAccess.save();
      res.status(201).json({ submission });
    } else {
      res.status(400).json({ message: "Error creating submission" });
    }
  } catch (error) {
    next(error);
  }
});

//UPDATES SPECIFIC ASSIGNMENT
assignmentRouter.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { body } = req;
    const assignment = await Assignment.findByIdAndUpdate(id, body, {
      new: true,
    });
    if (assignment) {
      res.json(assignment);
    } else {
      res.json({ message: `Error updating assignment: ${id}` });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GRANTS ACCESS TO ASSIGNMENT
 */
assignmentRouter.post("/access/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    assignment.status = "public";
    assignment.save();
    const classAccessList = await ClassAccess.find({
      classId: assignment.classId,
    });
    const accessList = [];
    for (const access of classAccessList) {
      const newAccess = await AssignAccess.create({
        studentId: access.studentId,
        assignmentId: assignment._id,
        accessLevel: "write",
      });
      accessList.push(newAccess);
    }
    if (accessList.length > 0) {
      res.status(201).json({ message: "Granted Access" });
    } else {
      res.status(400).json({ message: "Error granting access" });
    }
  } catch (error) {
    next(error);
  }
});

//DELETES ASSIGNMENT
assignmentRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedAssignment = await Assignment.findByIdAndDelete(id);
    if (deletedAssignment) {
      res.json({
        message: `Assignment deleted: ${id}`,
        deletedAssignment,
      });
    } else {
      res.json({ message: `Error deleting assignment: ${id}` });
    }
  } catch (error) {
    next(error);
  }
});

export default assignmentRouter;
