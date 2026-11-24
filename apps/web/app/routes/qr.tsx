import { pageMeta } from "~/i18n/meta";
import type { Route } from "./+types/qr";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

export default function Qr() {
  return null;
}
