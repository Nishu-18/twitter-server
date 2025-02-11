import { PrismaClient, Tweet } from "@prisma/client";
import { primsaClient } from "../../clients/db";
import { graphqlContext } from "../user/interfaces";
import { S3Client, PutObjectCommand} from "@aws-sdk/client-s3"
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
interface CreateTweetPayload{
    content:string,
    imageUrl?:string
}
const s3Client=new S3Client({region:process.env.AWS_DEFAULT_REGION})
const queries={
    getAllTweets:()=>primsaClient.tweet.findMany({
        orderBy:{createdAt:'desc'}

    }),
    getSignedUrlForTweet:async(parent:any,{imageType,imageName}:{imageType:string,imageName:string},ctx:graphqlContext)=>{
        if(!ctx.user || !ctx.user.id) throw new Error('UnAuthenticated!')
        const allowedImageType=["jpg","jpeg","png","webp"];
    // if(!allowedImageType.includes(imageType)){
    //     throw new Error('UnSupported Image Type!')
    // }
    const putObjectCommand=new PutObjectCommand({
        Bucket:'nishu-twitter',
        Key:`uploads/${ctx.user.id}/tweets/${imageName}-${Date.now().toString()}.${imageType}`
    })
    const signedUrl=await getSignedUrl(s3Client,putObjectCommand)
    return signedUrl

    }
    
}

const mutations={
    createTweet:async(parent:any,{payload}:{payload:CreateTweetPayload},ctx:graphqlContext)=>{
        if(!ctx.user){
            throw new Error('You are not Autenticated')
        }
       const tweet= await primsaClient.tweet.create({
            data:{
                content:payload.content,
                imageUrl:payload.imageUrl,
                author:{connect:{id:ctx.user.id}}
            }
        })
        return tweet
    }
    
}
const extraResolvers={
    Tweet:{
        author:(parent:Tweet)=>primsaClient.user.findUnique({
            where:{
                id:parent.authorId
            }
        })
    }
}
export const resolvers={mutations,extraResolvers,queries}