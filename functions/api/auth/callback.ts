import { finishAuth, type Context } from '../../../server/oauth.ts';
export const onRequestGet = ({ request, env }: Context) => finishAuth(request, env);
