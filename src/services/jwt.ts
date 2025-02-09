import { User } from "@prisma/client";
import { primsaClient } from "../clients/db";
import JWT from "jsonwebtoken"

class JWTservice{
    public static async  generatetokenForUSer(user:User){
      
        const payload={
            id:user?.id,
            email:user?.email
        }
       const token= JWT.sign(payload,"$ipedckjbfbj")
       return token
        

    }

}
export default JWTservice