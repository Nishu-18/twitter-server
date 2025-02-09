import { Prisma } from "@prisma/client"
import axios from "axios"
import { primsaClient } from "../../clients/db"
import JWTservice from "../../services/jwt"
import { graphqlContext } from "./interfaces"
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
    getCurrentUser:async(parent:any,args:any,ctx:graphqlContext)=>{
        console.log(ctx);
        
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

export const resolvers={queries}