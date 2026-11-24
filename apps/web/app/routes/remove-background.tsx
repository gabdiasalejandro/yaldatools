import { BgRemoverTool } from "~/features/bg-remover/BgRemoverTool";
import { pageMeta } from "~/i18n/meta";
import { useMessages } from "~/i18n/messages";
import { Desktop } from "~/shared/ui/Desktop";
import type { Route } from "./+types/remove-background";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

export default function RemoveBackground() {
  const t = useMessages();
  return (
    <Desktop task={t.removeBg.taskLabel} centered>
      <BgRemoverTool />
    </Desktop>
  );
}
