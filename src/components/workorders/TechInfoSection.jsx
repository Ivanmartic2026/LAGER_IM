import { Monitor, ExternalLink } from "lucide-react";

const INSTALL_LABELS = {
  ny_installation: 'Ny installation',
  byte_uppgradering: 'Byte / Uppgradering',
  tillagg: 'Tillägg',
  service_reparation: 'Service / Reparation',
  uthyrning_event: 'Uthyrning / Event',
};

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export default function TechInfoSection({ workOrder, order }) {
  const wo = workOrder;
  const screenDimensions = wo.screen_dimensions || order?.screen_dimensions;
  const pixelPitch = wo.pixel_pitch || order?.pixel_pitch;
  const moduleCount = wo.module_count ?? order?.module_count;
  const installationType = wo.installation_type || order?.installation_type;
  const installationDate = wo.installation_date || order?.installation_date;
  const siteVisitInfo = wo.site_visit_info || order?.site_visit_info;
  const siteNames = (wo.site_names?.length ? wo.site_names : order?.site_names) || [];
  const rmUrl = wo.rm_system_url || order?.rm_system_url;
  const rmId = wo.rm_system_id || order?.rm_system_id;
  const fortnoxProjNum = wo.fortnox_project_number || order?.fortnox_project_number;
  const fortnoxProjName = wo.fortnox_project_name || order?.fortnox_project_name;
  const fortnoxCustNum = wo.fortnox_customer_number || order?.fortnox_customer_number;
  const fortnoxOrderId = wo.fortnox_order_id || order?.fortnox_order_id;

  const hasTech = screenDimensions || pixelPitch || moduleCount != null || installationType || installationDate;
  const hasExtra = siteVisitInfo || siteNames.length > 0 || rmUrl || fortnoxProjNum;

  if (!hasTech && !hasExtra) return null;

  return (
    <div className="bg-black rounded-2xl border border-white/10 p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Monitor className="w-4 h-4 text-blue-400" />
        Teknisk information
      </h3>

      {hasTech && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <Field label="Skärmdimensioner" value={screenDimensions} />
          <Field label="Pixel pitch" value={pixelPitch} />
          <Field label="Antal moduler" value={moduleCount != null ? `${moduleCount} st` : null} />
          <Field label="Installationstyp" value={INSTALL_LABELS[installationType] || installationType} />
          <Field label="Installationsdatum" value={installationDate ? new Date(installationDate).toLocaleDateString('sv-SE') : null} />
        </div>
      )}

      {(siteNames.length > 0 || siteVisitInfo || rmUrl || fortnoxProjNum) && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          {siteNames.length > 0 && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">Siter</p>
              <div className="flex flex-wrap gap-1.5">
                {siteNames.map((s, i) => (
                  <span key={i} className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-md">{s}</span>
                ))}
              </div>
            </div>
          )}
          {fortnoxProjNum && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Fortnox Projekt</p>
              <p className="text-sm font-semibold text-white">#{fortnoxProjNum}{fortnoxProjName ? ` — ${fortnoxProjName}` : ''}</p>
            </div>
          )}
          {fortnoxCustNum && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Fortnox Kundnr</p>
              <p className="text-sm font-semibold text-white">{fortnoxCustNum}</p>
            </div>
          )}
          {fortnoxOrderId && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Fortnox Ordernr</p>
              <p className="text-sm font-semibold text-white">{fortnoxOrderId}</p>
            </div>
          )}
          {rmUrl && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">RM-system</p>
              <a href={rmUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
                <ExternalLink className="w-3.5 h-3.5" />
                {rmId || 'Öppna i RM-system'}
              </a>
            </div>
          )}
          {siteVisitInfo && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Platsbesöksinfo</p>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{siteVisitInfo}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}