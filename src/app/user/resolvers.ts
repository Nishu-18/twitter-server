import { Prisma, User } from "@prisma/client"
import axios from "axios"
import { primsaClient } from "../../clients/db"
import JWTservice from "../../services/jwt"
import { graphqlContext } from "./interfaces"
import { redisClient } from "../../clients/redis"
interface GoogleTokenResult{
    iss?: string
    azp?: string
    aud?: string
    sub?: string
    email:string
    email_verified: string
    nbf?: string
    name?: string
    picture?: string
    given_name: string
    family_name?: string
    iat?: string
    exp?: string,
    jti?: string
    alg?: string
    kid?: string
    typ?: string
  
}

const queries={
    verifyGoogleToken:async(parent:any,{token}:{token:string})=>{
        const googleToken=token
        const googleOauthUrl=new URL('https://oauth2.googleapis.com/tokeninfo')
        googleOauthUrl.searchParams.set('id_token',googleToken)
        const res=await axios.get<GoogleTokenResult>(googleOauthUrl.toString(),{
            responseType:'json'       
         })

         const user=await primsaClient.user.findUnique({
            where:{
                email:res.data.email
            }
         })
         if(!user){
            await primsaClient.user.create({
                data:{
                    email:res.data.email,
                    firstName:res.data.given_name,
                    lastName:res.data.family_name,
                    profileImageUrl:res.data.picture
                }
            })
         }
         const userIndb=await primsaClient.user.findUnique({
            where:{
                email:res.data.email
            }
         })
         if(!userIndb){
            throw new Error('User with email not found')
         }
         const userToken=JWTservice.generatetokenForUSer(userIndb)
        return userToken
    },
    getUserById:async(parent:any,{id}:{id:string},ctx:graphqlContext)=>primsaClient.user.findUnique({where:{id}})
    ,
    getCurrentUser:async(parent:any,args:any,ctx:graphqlContext)=>{
        
        
        const id= ctx.user?.id
        if(!id){
            return null
        }
        const user=await primsaClient.user.findUnique({
            where:{id}
        })
        return user
        
    }
}
const extraResolvers={
    User:{ 
        tweets:(parent:User)=>
            primsaClient.tweet.findMany({
                where:{
                    author:{id:parent.id}
                }
            }),
            followers:async(parent:User)=>{const result=await primsaClient.follows.findMany({where:{following:{id:parent.id}},include:{follower:true}})
            return result.map((el)=>el.follower)
        },
        following:async (parent:User)=>{const result=await primsaClient.follows.findMany({where:{follower:{id:parent.id}},include:{following:true}})
            return result.map((el)=>el.following)
    },
    recommendedUsers:async (parent:User,_:any,ctx:graphqlContext)=>{
        if(!ctx.user) return [];
        const cachedValue=await redisClient.get(`RECOMMENDED_USERS:${ctx.user.id}`)
        if(cachedValue){
            return JSON.parse(cachedValue)
        }
        const myfollowings=await primsaClient.follows.findMany({
            where:{

                follower:{id:ctx.user.id}
            },
            include:{following:{include:{followers:{include:{following:true}}}}}
        })
const users:User[]=[];
   for(const followings of myfollowings){
    for(const followingOfFollowedUser of followings.following.followers){
        if(followingOfFollowedUser.following.id!==ctx.user.id && myfollowings.findIndex(e=>e.followingId===followingOfFollowedUser.following.id)<0){
           users.push(followingOfFollowedUser.following)
            
        }
    }
   }
   await redisClient.set(`RECOMMENDED_USERS:${ctx.user.id}`,JSON.stringify(users))
    return users
    }
        }
        
    }

const mutation={
    followUser: async (parent: any, { to }: { to: string }, ctx: graphqlContext) => {
        if (!ctx.user || !ctx.user.id) {
            throw new Error('UnAuthenticated!');
        }
    
        try {
         
    
            const followEntry = await primsaClient.follows.create({
                data: {
                    follower: { connect: { id: ctx.user.id } },
                    following: { connect: { id: to } }
                }
            });
            await redisClient.del(`RECOMMENDED_USERS:${ctx.user.id}`)
    
            
    
            return true; // Ensure true is returned on success
        } catch (error) {
            console.error("Error in followUser mutation:", error);
            throw new Error("Failed to follow user");
        }
    },
    
    
    unFollowUser:async(parent:any,{to}:{to:string},ctx:graphqlContext)=>{
        if(!ctx.user|| !ctx.user.id) {
            throw new Error('UnAuthenticated!')
        }
      await primsaClient.follows.delete({
        where:{followerId_followingId:{followerId:ctx.user.id,followingId:to}}
       })
       await redisClient.del(`RECOMMENDED_USERS:${ctx.user.id}`)
        return true

        
    }

}


export const resolvers={queries,extraResolvers,mutation}