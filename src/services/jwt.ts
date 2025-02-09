import { User } from "@prisma/client";
import { primsaClient } from "../clients/db";
import JWT from "jsonwebtoken"
import { JWTuser } from "../app/user/interfaces";
const JWTsecret="$upper@shfvhfv"

class JWTservice{
    public static async  generatetokenForUSer(user:User){
      
        const payload:JWTuser={
            id:user?.id,
            email:user?.email
        }
       const token= JWT.sign(payload,JWTsecret)
       return token
        

    }
    public static decodeToken(token:string){
        try{
            return JWT.verify(token,JWTsecret) as JWTuser

        }catch(e){
            return null
        }
        
    }

}
export default JWTservice