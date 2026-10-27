import { startAuth, type Context } from '../../server/oauth.ts';
export const onRequestGet = ({ request, env }: Context) => startAuth(request, env);
