import { PdfHelp, PdfTool } from "~/features/pdf/PdfTool";
import { pageMeta } from "~/i18n/meta";
import { useMessages } from "~/i18n/messages";
import { Desktop } from "~/shared/ui/Desktop";
import type { Route } from "./+types/merge-pdf";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

export default function MergePdf() {
  const t = useMessages();
  return (
    <Desktop task={t.mergePdf.taskLabel} centered>
      <PdfTool />
      <PdfHelp />
    </Desktop>
  );
}
