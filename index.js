import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import bodyParser from 'body-parser'
import PostMessage from "./postMessage.js";
import Pusher from 'pusher'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from './user.js'
import auth from './ath.js'
//import postRoutes from './routes/posts.js';
const app=express();
dotenv.config();
app.use(bodyParser.json({limit:"100mb",extended:true}));
app.use(bodyParser.urlencoded({limit:"100mb",extended:true}));
app.use(cors());

//app.use('/posts', postRoutes);
//npm run build and open in chromo and drag and drop
//domain setting and option and change url

//const CONNECTION_URL='mongodb+srv://prit:Prit@cluster0.praxiix.mongodb.net/memoriesdb?retryWrites=true&w=majority';

//Dbname

const PORT=process.env.PORT || 9000;
const pusher = new Pusher({
    appId: "1455792",
    key: "9c25d2586a2494546f2a",
    secret: "4b70e175af65c8a9a692",
    cluster: "ap2",
    useTLS: true
  });
  
mongoose.connect(process.env.CONNECTION_URL,{
useNewUrlParser:true,
useUnifiedTopology:true
}).then(()=>{
    app.listen(PORT,()=>{
        console.log("running")
    })
}).catch((err)=>{
    console.log(err.message)
});

mongoose.connection.once('open',()=>{
    console.log("connected")
    const changeStream =mongoose.connection.collection('postmessages').watch()
    changeStream.on('change',(change)=>{
        console.log(change)
        if(change.operationType === 'insert'){
            console.log("pusher trigger")

            pusher.trigger('postmessages','inserted',{
               
            })
        }
        else if(change.operationType === 'update'){
            console.log("pusher trigger")

            pusher.trigger('postmessages','updated',{
                
            })
        }
        else if(change.operationType === 'delete'){
            console.log("pusher trigger")

            pusher.trigger('postmessages','updated',{
                change:change
            })
        }
        else{
            console.log("error triggering pusher")
        }
    })
})
app.get('/',(req,res)=>{
    res.status(200).send("hello")
})


app.post('/upload/post',async(req,res)=>{
    const post = req.body;

    const newPostMessage = new PostMessage({ ...post, creator: req.userId, createdAt: new Date().toISOString() })

    try {
        await newPostMessage.save();

        res.status(201).json(newPostMessage );
    } catch (error) {
        res.status(409).json({ message: error.message });
    }
  
    
  
})

app.post('/signin',async(req,res)=>{
    const { email, password } = req.body;
    try {
        const oldUser = await User.findOne({ email });
    
        if (!oldUser) return res.status(404).json({ message: "User doesn't exist" });
    
        const isPasswordCorrect = await bcrypt.compare(password, oldUser.password);
    
        if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });
    
        const token = jwt.sign({ email: oldUser.email, id: oldUser._id }, 'test', { expiresIn: "1h" });
    
        res.status(200).json({ result: oldUser, token });
      } catch (err) {
        res.status(500).json({ message: "Something went wrong" });
      }
})
app.post('/signup',async(req,res)=>{
    console.log("hhh")
    const { email, password,confirmPassword, firstName, lastName } = req.body;

    try {
      const oldUser = await User.findOne({ email });
  
      if (oldUser) return res.status(400).json({ message: "User already exists" });
  if(password !== confirmPassword) return res.status(400).json({ message: "password not match" });
      const hashedPassword = await bcrypt.hash(password, 12);
  
      const result = await User.create({ email, password: hashedPassword, name: `${firstName} ${lastName}` });
  
      const token = jwt.sign( { email: result.email, id: result._id }, 'test', { expiresIn: "1h" } );
  
      res.status(201).json({ result, token });
    } catch (error) {
      res.status(500).json({ message: "Something went wrong" });
      
      console.log(error);
    }
  
})


app.get('/retrieve/posts',async(req,res)=>{
    const {page} =req.query
//we page page as number from frontend but converted to string during pass to backebnd
        try {
            const LIMIT =8;//post per page
            const startIndex=(Number(page)-1) * LIMIT  //get startting index of page
            const total= await PostMessage.countDocuments({})  //how many post we have

            const posts = await PostMessage.find().sort({_id:-1}).limit(LIMIT).skip(startIndex);
                    
            res.status(200).json({data:posts,currentPage:Number(page),numberOfPages:Math.ceil(total/LIMIT)});
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
    })
/*  without pagination code
app.get('/retrieve/posts',async(req,res)=>{
console.log("hoo")
    try {
        const postMessages = await PostMessage.find();
                
        res.status(200).json(postMessages);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
})
*/
//query /posts/?page=1  page=1
//params /post/123   id=123  

app.get('/post/:id',async(req,res)=>{
    const {id} =req.params;
    try{
const post=await PostMessage.findById(id)
res.status(200).json(post)
    }catch(error){
        res.status(404).json({ message: error.message });
    }
})
app.get('/search',async(req,res)=>{
    console.log("sfbjsb")
   
 const {searchQuery,tags}=req.query
    try{
const title=new RegExp(searchQuery,'i')
const posts = await PostMessage.find({ $or: [ { title }, { tags: { $in: tags.split(',') } } ]});
//find post which has title or array of tags contain
        res.json({ data: posts });
    }
    catch(error){
        res.status(404).json({ message: error.message });
    }
})

app.patch('/:id/updatePost',async (req,res)=>{
    const { id } = req.params;
    const {title,message,creator,tags,selectedFile}=req.body
    
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);

    const updatedPost = { creator, title, message, tags, selectedFile, _id: id };

    await PostMessage.findByIdAndUpdate(id, updatedPost, { new: true });

    res.json(updatedPost);
})

app.patch('/:id/likePost',auth,async (req,res)=>{
    
    console.log("sdcdsc")
    console.log(req.userId)
    const { id } = req.params;
    if(!req.userId) return res.json({message:"unauthonticated"})
    
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);

    //const updatedPost = { creator, title, message, tags, selectedFile, _id: id };

    const post= await PostMessage.findById(id);

    const index=post.likes.findIndex((id)=> id === String(req.userId))

    if(index== -1){
        post.likes.push(req.userId)
    }
    else{
        post.likes= post.likes.filter((id)=> id !== String(req.userId));
    }
    const updatedPost =await PostMessage.findByIdAndUpdate(id,post,{ new: true })
    res.json(updatedPost);
})
app.post('/:id/commentPost',auth,async (req,res)=>{
    const {id}=req.params;
    const {value}=req.body;

    const post= await PostMessage.findById(id);
    post.comments.push(value);
    const updatedPost = await PostMessage.findByIdAndUpdate(id, post, { new: true });

    res.json(updatedPost);


})
app.get('/creator',async (req, res) => {
    const { name } = req.query;

    try {
        const posts = await PostMessage.find({ name });

        res.json({ data: posts });
    } catch (error) {    
        res.status(404).json({ message: error.message });
    }
})
app.delete('/:id/deletePost',async (req,res)=>{
    const { id } = req.params;

    
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);

    //const updatedPost = { creator, title, message, tags, selectedFile, _id: id };

    await PostMessage.findByIdAndRemove(id);

    res.json({message:"post deleted successfullly"});
})


/*
import PostMessage from "../models/postMessage.js";


export const getPosts=async (req,res)=>{
    try{
const postMessage= await PostMessage.find();
res.status(200).json(postMessage);
    }
    catch(err){
res.status(404).json({message:err.message});
    }
}

export const createPost= async(req,res)=>{
    const post=req.body;
    const newPost=new PostMessage(post);
    try{
 await newPost.save();
 res.status(201).json(newPost);
    }
    catch(err){
res.status(409).json({ message:err.message})
    }
    res.send('post creation');
}
*/

//createpost ma auth
//update post ma auth
//delete ma auth
//like ma auth