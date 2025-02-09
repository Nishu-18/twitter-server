import { PrismaClient, Tweet } from "@prisma/client";
import { primsaClient } from "../../clients/db";
import { graphqlContext } from "../user/interfaces";
interface CreateTweetPayload{
    content:string,
    imageUrl?:string
}
const queries={
    getAllTweets:()=>primsaClient.tweet.findMany({
        orderBy:{createdAt:'desc'}

    })
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