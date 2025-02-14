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
const redis_1 = require("../../clients/redis");
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
    }),
    getUserById: (parent_1, _a, ctx_1) => __awaiter(void 0, [parent_1, _a, ctx_1], void 0, function* (parent, { id }, ctx) { return db_1.primsaClient.user.findUnique({ where: { id } }); }),
    getCurrentUser: (parent, args, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const id = (_a = ctx.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!id) {
            return null;
        }
        const user = yield db_1.primsaClient.user.findUnique({
            where: { id }
        });
        return user;
    })
};
const extraResolvers = {
    User: {
        tweets: (parent) => db_1.primsaClient.tweet.findMany({
            where: {
                author: { id: parent.id }
            }
        }),
        followers: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield db_1.primsaClient.follows.findMany({ where: { following: { id: parent.id } }, include: { follower: true } });
            return result.map((el) => el.follower);
        }),
        following: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield db_1.primsaClient.follows.findMany({ where: { follower: { id: parent.id } }, include: { following: true } });
            return result.map((el) => el.following);
        }),
        recommendedUsers: (parent, _, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            if (!ctx.user)
                return [];
            const cachedValue = yield redis_1.redisClient.get(`RECOMMENDED_USERS:${ctx.user.id}`);
            if (cachedValue) {
                return JSON.parse(cachedValue);
            }
            const myfollowings = yield db_1.primsaClient.follows.findMany({
                where: {
                    follower: { id: ctx.user.id }
                },
                include: { following: { include: { followers: { include: { following: true } } } } }
            });
            const users = [];
            for (const followings of myfollowings) {
                for (const followingOfFollowedUser of followings.following.followers) {
                    if (followingOfFollowedUser.following.id !== ctx.user.id && myfollowings.findIndex(e => e.followingId === followingOfFollowedUser.following.id) < 0) {
                        users.push(followingOfFollowedUser.following);
                    }
                }
            }
            yield redis_1.redisClient.set(`RECOMMENDED_USERS:${ctx.user.id}`, JSON.stringify(users));
            return users;
        })
    }
};
const mutation = {
    followUser: (parent_1, _a, ctx_1) => __awaiter(void 0, [parent_1, _a, ctx_1], void 0, function* (parent, { to }, ctx) {
        if (!ctx.user || !ctx.user.id) {
            throw new Error('UnAuthenticated!');
        }
        try {
            const followEntry = yield db_1.primsaClient.follows.create({
                data: {
                    follower: { connect: { id: ctx.user.id } },
                    following: { connect: { id: to } }
                }
            });
            yield redis_1.redisClient.del(`RECOMMENDED_USERS:${ctx.user.id}`);
            return true; // Ensure true is returned on success
        }
        catch (error) {
            console.error("Error in followUser mutation:", error);
            throw new Error("Failed to follow user");
        }
    }),
    unFollowUser: (parent_1, _a, ctx_1) => __awaiter(void 0, [parent_1, _a, ctx_1], void 0, function* (parent, { to }, ctx) {
        if (!ctx.user || !ctx.user.id) {
            throw new Error('UnAuthenticated!');
        }
        yield db_1.primsaClient.follows.delete({
            where: { followerId_followingId: { followerId: ctx.user.id, followingId: to } }
        });
        yield redis_1.redisClient.del(`RECOMMENDED_USERS:${ctx.user.id}`);
        return true;
    })
};
exports.resolvers = { queries, extraResolvers, mutation };
