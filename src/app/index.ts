
import express from "express"
import {ApolloServer} from "@apollo/server"
import {expressMiddleware} from "@apollo/server/express4"
import  bodyParser  from "body-parser"
import cors from "cors"
import { User } from "./user"
import {Tweet} from "./tweet"
import { graphqlContext } from "./user/interfaces"
import JWTservice from "../services/jwt"
import { mutations } from "./tweet/mutations"



export async function initServer() {
   
    const app=express()
    app.use(cors())
    app.use(bodyParser.json())
    const graphqlServer=new ApolloServer<graphqlContext>({
        typeDefs:`${User.types}
        ${Tweet.types}
        type Query{
            ${User.queries}
            ${Tweet.queries}
        }
         type Mutation {
         ${Tweet.mutations}
         ${User.mutation}

         }   `
        ,
        resolvers:{
            Query:{
                ...User.resolvers.queries,
                ...Tweet.resolvers.queries

            },
            Mutation:{
                ...Tweet.resolvers.mutations,
                ...User.resolvers.mutation
            },
            ...Tweet.resolvers.extraResolvers,
            ...User.resolvers.extraResolvers 

        }
    })
    await graphqlServer.start()
    app.use('/graphql',expressMiddleware(graphqlServer,{
        context:async({req,res})=>{
            return{
                user:req.headers.authorization?JWTservice.decodeToken(req.headers.authorization.split('Bearer ')[1]):undefined

            }
            
        }
    }))
    return app
    
}