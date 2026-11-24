import { QrTool } from "~/features/qr/QrTool";
import { pageMeta } from "~/i18n/meta";
import { useMessages } from "~/i18n/messages";
import { Desktop } from "~/shared/ui/Desktop";
import type { Route } from "./+types/qr";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

export default function Qr() {
  const t = useMessages();
  return (
    <Desktop task={t.qr.taskLabel} centered>
      <QrTool />
    </Desktop>
  );
}
