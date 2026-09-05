import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/features/auth/queries/get-auth-context";
import { getSettings } from "@/features/settings/queries/get-settings";
import { SettingsForms } from "@/features/settings/components/settings-forms";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  await requireOwner();
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes"
        description="Comisiones, tasa de cambio, horario y datos del salón"
      />
      <SettingsForms settings={settings} />
    </div>
  );
}
