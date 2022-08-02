
import express from 'express';

import { likePost } from '../controllers/posts.js';

const router = express.Router();
import auth from "./ath.js";


router.patch('/:id/likePost', auth, likePost);

export default router;