"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../../clients/db");
const jwt_1 = __importDefault(require("../../services/jwt"));
const queries = {
    verifyGoogleToken: (parent_1, _a) => __awaiter(void 0, [parent_1, _a], void 0, function* (parent, { token }) {
        const googleToken = token;
        const googleOauthUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
        googleOauthUrl.searchParams.set('id_token', googleToken);
        const res = yield axios_1.default.get(googleOauthUrl.toString(), {
            responseType: 'json'
        });
        const user = yield db_1.primsaClient.user.findUnique({
            where: {
                email: res.data.email
            }
        });
        if (!user) {
            yield db_1.primsaClient.user.create({
                data: {
                    email: res.data.email,
                    firstName: res.data.given_name,
                    lastName: res.data.family_name,
                    profileImageUrl: res.data.picture
                }
            });
        }
        const userIndb = yield db_1.primsaClient.user.findUnique({
            where: {
                email: res.data.email
            }
        });
        if (!userIndb) {
            throw new Error('User with email not found');
        }
        const userToken = jwt_1.default.generatetokenForUSer(userIndb);
        return userToken;
    })
};
exports.resolvers = { queries };
