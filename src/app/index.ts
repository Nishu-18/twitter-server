import express from "express"
import {ApolloServer} from "@apollo/server"
import {expressMiddleware} from "@apollo/server/express4"
import  bodyParser  from "body-parser"
import cors from "cors"
import { User } from "./user"
import { graphqlContext } from "./user/interfaces"
import JWTservice from "../services/jwt"


export async function initServer() {
   
    const app=express()
    app.use(cors())
    app.use(bodyParser.json())
    const graphqlServer=new ApolloServer<graphqlContext>({
        typeDefs:`${User.types}
        type Query{
            ${User.queries}
        }`,
        resolvers:{
            Query:{
                ...User.resolvers.queries
            }

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