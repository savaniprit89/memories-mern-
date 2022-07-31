import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import bodyParser from 'body-parser'
import PostMessage from "./postMessage.js";
import Pusher from 'pusher'
import dotenv from 'dotenv'

const app=express();
dotenv.config();
app.use(bodyParser.json({limit:"100mb",extended:true}));
app.use(bodyParser.urlencoded({limit:"100mb",extended:true}));
app.use(cors());
//deploy heroku and axios url change
//netlify frontend login sites and got to drap and drop 
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


app.post('/upload/post',(req,res)=>{
    const dbPost= req.body
    console.log(dbPost)
   PostMessage.create(dbPost,(err,data)=>{
        if(err){
res.status(500).send(err)
//console.log(err)
        }
        else{
res.status(201).json(data)
        }
    })
})

app.get('/retrieve/posts',(req,res)=>{
    PostMessage.find((err,data)=>{
        if(err){
            res.status(500).send(err)
                    }
                    else{
                       
            res.status(200).send(data)
                    }
    })
})

app.patch('/:id/updatePost',async (req,res)=>{
    const { id } = req.params;
    const post = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);

    //const updatedPost = { creator, title, message, tags, selectedFile, _id: id };

    const updatedPost= await PostMessage.findByIdAndUpdate(id, {...post,id}, { new: true });

    res.json(updatedPost);
})
app.patch('/:id/likePost',async (req,res)=>{
    const { id } = req.params;
    
    
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);

    //const updatedPost = { creator, title, message, tags, selectedFile, _id: id };

    const post= await PostMessage.findById(id);
    const updatedPost =await PostMessage.findByIdAndUpdate(id,{likeCount:post.likeCount + 1},{ new: true })
    res.json(updatedPost);
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