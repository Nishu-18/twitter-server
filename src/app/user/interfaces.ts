export interface JWTuser{
    id:string,
    email:string
}
export interface graphqlContext{
    user?:JWTuser
}