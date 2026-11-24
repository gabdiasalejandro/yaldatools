import { ExifHelp, ExifTool } from "~/features/exif/ExifTool";
import { pageMeta } from "~/i18n/meta";
import { useMessages } from "~/i18n/messages";
import { Desktop } from "~/shared/ui/Desktop";
import type { Route } from "./+types/remove-exif";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

export default function RemoveExif() {
  const t = useMessages();
  return (
    <Desktop task={t.exif.taskLabel} centered>
      <ExifTool />
      <ExifHelp />
    </Desktop>
  );
}
