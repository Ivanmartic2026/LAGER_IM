import React, { useState } from 'react';
import AddressAutocomplete from '@/components/orders/AddressAutocomplete';
import FortnoxCustomerSelect from '@/components/orders/FortnoxCustomerSelect';
import FilePreviewItem from '@/components/shared/FilePreview';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language/LanguageProvider";
import { t, tFinancialStatus } from "@/components/language/translations";

const FormSection = ({ title, icon, children, className }) => (
  <div className={cn("bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4", className)}>
    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      {icon && <span>{icon}</span>}
      {title}
    </h2>
    {children}
  </div>
);

const FormGroup = ({ label, required = false, helpText, children }) => (
  <div>
    <label className="text-sm font-medium text-slate-300 mb-2 block">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {helpText && <p className="text-xs text-slate-500 mt-1">{helpText}</p>}
  </div>
);

function FileUploadGroup({ label, files, onUpload, onRemove, uploading, accept, uploadLabel, addLabel }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      {files.map((f, i) => (
        <FilePreviewItem key={i} url={f.url} name={f.name} onRemove={() => onRemove(i)} />
      ))}
      <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-dashed border-white/20 cursor-pointer hover:bg-white/10 transition-all">
        <Upload className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">{uploading ? uploadLabel : addLabel}</span>
        <input type="file" className="hidden" onChange={onUpload} disabled={uploading} accept={accept} />
      </label>
    </div>
  );
}

export default function ProjectInfoSection({ formData, setFormData, workOrders = [], onFileUpload }) {
  const { language } = useLanguage();
  const [uploadingType, setUploadingType] = useState(null);

  const handleFileUpload = async (type, e) => {
    const file = e.target.files?.[0];
    if (!file || !onFileUpload) return;
    setUploadingType(type);
    await onFileUpload(type, file);
    setUploadingType(null);
    e.target.value = '';
  };

  const removeFile = (type, index) => {
    if (type === 'source_document') {
      setFormData({ ...formData, source_document_url: '' });
    } else {
      const files = [...(formData.uploaded_files || [])];
      files.splice(index, 1);
      setFormData({ ...formData, uploaded_files: files });
    }
  };

  const getFilesByType = (type) =>
    (formData.uploaded_files || []).filter(f => f.type === type);

  return (
    <>
      {/* 1. KUNDINFORMATION */}
      <FormSection title={t('section_customer_info', language)} icon="👤">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label={t('field_customer_name', language)} required>
            <Input
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder={t('ph_customer_name', language)}
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </FormGroup>

          <FormGroup label={t('field_customer_reference', language)}>
            <Input
              value={formData.customer_reference}
              onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
              placeholder={t('ph_customer_reference', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label={t('field_fortnox_customer', language)}>
            <FortnoxCustomerSelect
              value={formData.fortnox_customer_number || ''}
              customerName={formData.customer_name || ''}
              onChange={(num) => setFormData(prev => ({ ...prev, fortnox_customer_number: num }))}
              onSelect={(customer) => setFormData(prev => ({
                ...prev,
                fortnox_customer_number: customer.CustomerNumber,
                customer_name: prev.customer_name ? prev.customer_name : (customer.Name || prev.customer_name),
              }))}
            />
          </FormGroup>

          <FormGroup label={t('field_delivery_contact', language)}>
            <Input
              value={formData.delivery_contact_name || ''}
              onChange={(e) => setFormData({ ...formData, delivery_contact_name: e.target.value })}
              placeholder={t('ph_delivery_contact', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label={t('field_contact_phone', language)}>
            <Input
              value={formData.delivery_contact_phone || ''}
              onChange={(e) => setFormData({ ...formData, delivery_contact_phone: e.target.value })}
              placeholder={t('ph_contact_phone', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>
        </div>
      </FormSection>

      {/* 2. EKONOMI & FORTNOX */}
      <FormSection title={t('section_finance', language)} icon="💼">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormGroup label={t('field_order_number', language)}>
            <Input
              value={formData.order_number}
              onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
              placeholder={t('ph_order_number', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label={t('field_fortnox_project_nr', language)}>
            <Input
              value={formData.fortnox_project_number || ''}
              onChange={(e) => setFormData({ ...formData, fortnox_project_number: e.target.value })}
              placeholder={t('ph_fortnox_project_nr', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label={t('field_fortnox_project_name', language)}>
            <Input
              value={formData.fortnox_project_name || ''}
              onChange={(e) => setFormData({ ...formData, fortnox_project_name: e.target.value })}
              placeholder={t('ph_fortnox_project_name', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>
        </div>

        {formData.financial_status && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-slate-400">{t('field_billing_status', language)}:</span>
            <Badge className={
              formData.financial_status === 'billed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
              formData.financial_status === 'pending_billing' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
              'bg-slate-500/20 text-slate-300 border-slate-500/30'
            }>
              {tFinancialStatus(formData.financial_status, language)}
            </Badge>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          {formData.fortnox_order_id ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-medium">
              ✅ Synkad med Fortnox · #{formData.fortnox_order_id}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-medium">
              ⚠️ Ej synkad med Fortnox
            </span>
          )}
          {formData.fortnox_project_number && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-medium">
              ✅ Projekt kopplat · {formData.fortnox_project_number}
            </span>
          )}
          {formData.rm_system_id ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium">
              ✅ Kopplad till IM Workspace · {formData.rm_system_id}
              {formData.rm_system_url && (
                <a href={formData.rm_system_url} target="_blank" rel="noopener noreferrer" className="ml-1 underline hover:text-blue-200">Öppna i RM →</a>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-400 text-xs font-medium">
              ⚠️ Ej kopplad till IM Workspace
            </span>
          )}
        </div>
      </FormSection>

      {/* 3. LEVERANSINFORMATION */}
      <FormSection title={t('section_delivery_info', language)} icon="🚚">
        <FormGroup label={t('field_delivery_address', language)} required>
          <AddressAutocomplete
            value={formData.delivery_address || ''}
            onChange={(val) => setFormData(prev => ({ ...prev, delivery_address: val }))}
            onSelect={({ street, city, postcode }) => setFormData(prev => ({
              ...prev,
              delivery_address: street,
              ...(city ? { delivery_city: city } : {}),
              ...(postcode ? { delivery_postcode: postcode } : {}),
            }))}
            placeholder={t('ph_delivery_address', language)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </FormGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label={t('field_delivery_date', language)} required>
            <Input
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </FormGroup>

          <FormGroup label={t('field_delivery_method', language)}>
            <Select value={formData.delivery_method || ''} onValueChange={(v) => setFormData({ ...formData, delivery_method: v })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder={language === 'en' ? 'Select delivery method' : 'Välj leveranssätt'} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="truck">{t('delivery_truck', language)}</SelectItem>
                <SelectItem value="courier">{t('delivery_courier', language)}</SelectItem>
                <SelectItem value="air_freight">{t('delivery_air', language)}</SelectItem>
                <SelectItem value="sea_freight">{t('delivery_sea', language)}</SelectItem>
                <SelectItem value="pickup">{t('delivery_pickup', language)}</SelectItem>
                <SelectItem value="other">{t('delivery_other', language)}</SelectItem>
              </SelectContent>
            </Select>
          </FormGroup>

          <FormGroup label={t('field_carrier', language)}>
            <Input
              value={formData.shipping_company || ''}
              onChange={(e) => setFormData({ ...formData, shipping_company: e.target.value })}
              placeholder={t('ph_carrier', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label={t('field_installation_date', language)} helpText={t('help_installation_date', language)}>
            <Input
              type="date"
              value={formData.installation_date || ''}
              onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label={t('field_installation_type', language)}>
            <Select value={formData.installation_type || ''} onValueChange={(v) => setFormData({ ...formData, installation_type: v })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder={language === 'en' ? 'Select type' : 'Välj typ'} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="ny_installation">{t('install_new', language)}</SelectItem>
                <SelectItem value="byte_uppgradering">{t('install_replacement', language)}</SelectItem>
                <SelectItem value="tillagg">{t('install_addition', language)}</SelectItem>
                <SelectItem value="service_reparation">{t('install_service', language)}</SelectItem>
                <SelectItem value="uthyrning_event">{t('install_rental', language)}</SelectItem>
              </SelectContent>
            </Select>
          </FormGroup>
        </div>
      </FormSection>

      {/* 4. TEKNISK INFORMATION */}
      <FormSection title={t('section_technical_info', language)} icon="🔧">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label={t('field_screen_dimensions', language)}>
            <Input
              value={formData.screen_dimensions || ''}
              onChange={(e) => setFormData({ ...formData, screen_dimensions: e.target.value })}
              placeholder={t('ph_screen_dimensions', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label={t('field_pixel_pitch', language)}>
            <Input
              value={formData.pixel_pitch || ''}
              onChange={(e) => setFormData({ ...formData, pixel_pitch: e.target.value })}
              placeholder={t('ph_pixel_pitch', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label={t('field_module_count', language)}>
            <Input
              type="number"
              value={formData.module_count || ''}
              onChange={(e) => setFormData({ ...formData, module_count: e.target.value ? parseInt(e.target.value) : '' })}
              placeholder={t('ph_module_count', language)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>
        </div>

        <FormGroup label={t('field_site_visit_info', language)} required helpText={t('help_site_visit_tip', language)}>
          <Textarea
            value={formData.site_visit_info}
            onChange={(e) => setFormData({ ...formData, site_visit_info: e.target.value })}
            placeholder={t('ph_site_visit_info', language)}
            className="bg-slate-800 border-slate-700 text-white h-28"
          />
        </FormGroup>
      </FormSection>

      {/* 5. SPECIELLA KRAV */}
      <FormSection title={t('section_special_requirements', language)} icon="⚠️" className="border-yellow-500/30 bg-yellow-500/5">
        <p className="text-xs text-yellow-400/80 -mt-2 mb-2">{t('warning_team_visible', language)}</p>
        <Textarea
          value={formData.critical_notes || ''}
          onChange={(e) => setFormData({ ...formData, critical_notes: e.target.value })}
          placeholder={t('ph_critical_notes', language)}
          className="bg-slate-800 border-yellow-500/30 text-white h-28 focus-visible:ring-yellow-500/50"
        />
      </FormSection>

      {/* 6. DOKUMENT */}
      <FormSection title={t('section_documents', language)} icon="📎">
        <p className="text-xs text-slate-400 -mt-2 mb-2">{t('help_documents', language)}</p>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">{t('btn_customer_order', language)}</label>
          {formData.source_document_url ? (
            <FilePreviewItem
              url={formData.source_document_url}
              name={t('btn_customer_order', language)}
              onRemove={() => removeFile('source_document')}
            />
          ) : (
            <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-dashed border-white/20 cursor-pointer hover:bg-white/10 transition-all">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">{uploadingType === 'source_document' ? t('common_uploading', language) : t('btn_select_file', language)}</span>
              <input type="file" className="hidden" onChange={(e) => handleFileUpload('source_document', e)} disabled={!!uploadingType} />
            </label>
          )}
        </div>

        <FileUploadGroup label={t('btn_drawings', language)} files={getFilesByType('drawing')}
          onUpload={(e) => handleFileUpload('drawing', e)} onRemove={(i) => removeFile('drawing', i)}
          uploading={uploadingType === 'drawing'} uploadLabel={t('common_uploading', language)} addLabel={t('btn_add_file', language)} />

        <FileUploadGroup label={t('btn_site_images', language)} files={getFilesByType('site_image')}
          onUpload={(e) => handleFileUpload('site_image', e)} onRemove={(i) => removeFile('site_image', i)}
          uploading={uploadingType === 'site_image'} accept="image/*" uploadLabel={t('common_uploading', language)} addLabel={t('btn_add_file', language)} />

        <FileUploadGroup label={t('btn_other_docs', language)} files={getFilesByType('other')}
          onUpload={(e) => handleFileUpload('other', e)} onRemove={(i) => removeFile('other', i)}
          uploading={uploadingType === 'other'} uploadLabel={t('common_uploading', language)} addLabel={t('btn_add_file', language)} />
      </FormSection>

      {/* 7. KOPPLADE ARBETSORDRAR */}
      {workOrders.length > 0 && (
        <FormSection title={t('section_linked_work_orders', language)} icon="🔗">
          <div className="space-y-2">
            {workOrders.map(wo => {
              const woName = wo.name || wo.order_number || `Arbetsorder #${wo.id?.slice(0, 6)}`;
              const statusLabel = {
                'väntande': 'Väntande', 'väntar': 'Väntande', 'pending': 'Väntande',
                'pågår': 'Pågår', 'in_progress': 'Pågår',
                'klar': 'Klar', 'completed': 'Klar',
                'avbruten': 'Avbruten'
              }[wo.status] || wo.status;
              const statusColor = {
                'Väntande': 'bg-slate-500/20 text-slate-300',
                'Pågår': 'bg-blue-500/20 text-blue-300',
                'Klar': 'bg-green-500/20 text-green-300',
                'Avbruten': 'bg-red-500/20 text-red-300'
              }[statusLabel] || 'bg-slate-500/20 text-slate-300';
              const stageLabel = {
                'konstruktion': 'Konstruktion', 'produktion': 'Produktion',
                'lager': 'Lager', 'montering': 'Montering', 'leverans': 'Leverans'
              }[wo.current_stage] || wo.current_stage;
              return (
                <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{woName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={statusColor}>{statusLabel}</Badge>
                      {stageLabel && <span className="text-xs text-slate-400">{stageLabel}</span>}
                      {wo.technician_name && <span className="text-xs text-slate-500">• {wo.technician_name}</span>}
                    </div>
                  </div>
                  <Link
                    to={`/WorkOrders/${wo.id}`}
                    className="ml-3 text-blue-400 text-xs hover:underline flex items-center gap-1 flex-shrink-0"
                  >
                    {t('btn_see_work_order', language)} <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </FormSection>
      )}
    </>
  );
}