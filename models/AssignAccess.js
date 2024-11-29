import mongoose from "mongoose";
import Student from "./Student.js";
import Assignment from "./Assignment.js";

const accessLevel = {
    values: ['write', 'view'],
  message: 'enum validator failed for path `{PATH}` with value `{VALUE}`'
}

const assignAccessSchema = new mongoose.Schema({
    studentId : {
        type: mongoose.ObjectId,
        ref: Student,
        required: true
    },
    assignmentId :  {
        type: mongoose.ObjectId,
        ref:Assignment,
        required: true
    },
    accessLevel: {
        type: String,
        enum: accessLevel
    }
});

const AssignAccess = new mongoose.model('AssignAccess', assignAccessSchema);
export default AssignAccess;