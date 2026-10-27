import { authStatus, type Context } from '../../../server/oauth.ts';
export const onRequestGet = ({ request, env }: Context) => authStatus(request, env);
