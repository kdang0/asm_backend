import { Router } from 'express';
import Submission from '../models/Submission.js';
import Student from '../models/Student.js';


const submissionRouter = new Router();

//GET SPECIFIC SUBMISSION
submissionRouter.get('/:id', async (req,res,next) => {
    try{
        const {id} = req.params;
        const submission = await Submission.findById(id);
        if(submission) {
            res.json(submission);
        } else{
            res.json({message: `No submission found with id: ${id}`});
        }
    } catch(err){
        next(err);
    }
});


//GET SUBMISSION BASED ON STUDENT AND ASSIGNMENT
submissionRouter.get('/assignment/:assignId/:userId', async(req,res,next) => {
    try{
        const {userId, assignId} = req.params;
        const student = await Student.findOne({userId: userId});
        if(student){
            const submission = await Submission.findOne({studentId: student._id, assignmentId: assignId});
            if(submission){
                res.json(submission);
            } else{
                res.json({message: `No submission found with follwing assignment ID ${assignId} and student ID ${student._id}`});
            }
        } else{
           res.json({message: `No student found with following user ID ${userId}`});
        }

    } catch(err){ 
        next(err);
    }
});


submissionRouter.patch('/:id', async(req,res,next) => {
    try{
        const {id} = req.params;
        const {body} = req;
        const submission = await Submission.findByIdAndUpdate(id, body, {
            new: true
        });
        console.log(submission);
        if(submission) {
            res.status(204).send();
        } else {
            res.status(400).json({message: `Error updating submission ${id}`})
        }
    } catch(err){
        next(err);
    }
});

export default submissionRouter;