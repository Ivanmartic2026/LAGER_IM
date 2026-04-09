import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FormSection = ({ title, children }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
    <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
    {children}
  </div>
);

const FormGroup = ({ label, required = false, children }) => (
  <div>
    <label className="text-sm font-medium text-slate-300 mb-2 block">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
  </div>
);

export default function ProjectInfoSection({ formData, setFormData }) {
  return (
    <>
      {/* Kundinformation */}
      <FormSection title="Kundinformation">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label="Kundnamn" required>
            <Input
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="Kundnamn"
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </FormGroup>

          <FormGroup label="Kundreferens">
            <Input
              value={formData.customer_reference}
              onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
              placeholder="Referens"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label="Fortnox Kund">
            <Input
              value={formData.fortnox_customer_number}
              onChange={(e) => setFormData({ ...formData, fortnox_customer_number: e.target.value })}
              placeholder="T.ex. 1234"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>
        </div>
      </FormSection>

      {/* Leveransinformation */}
      <FormSection title="Leveransinformation">
        <FormGroup label="Leveransadress" required>
          <Textarea
            value={formData.delivery_address}
            onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
            placeholder="Fullständig leveransadress..."
            className="bg-slate-800 border-slate-700 text-white h-20"
            required
          />
        </FormGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label="Leveransdatum" required>
            <Input
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </FormGroup>

          <FormGroup label="Leveranssätt">
            <Input
              value={formData.delivery_method || ''}
              onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
              placeholder="T.ex. Lastbil, Bud"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label="Speditör">
            <Input
              value={formData.shipping_company || ''}
              onChange={(e) => setFormData({ ...formData, shipping_company: e.target.value })}
              placeholder="T.ex. DHL, Schenker"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>
        </div>
      </FormSection>

      {/* Teknisk information */}
      <FormSection title="Teknisk information">
        <FormGroup label="Platsbesöksinfo">
          <Textarea
            value={formData.site_visit_info}
            onChange={(e) => setFormData({ ...formData, site_visit_info: e.target.value })}
            placeholder="Datum, kontaktperson, vad som ska göras på platsen..."
            className="bg-slate-800 border-slate-700 text-white h-20"
          />
        </FormGroup>

        <FormGroup label="Anteckningar från sälj">
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Specialkrav, instruktioner, varningar..."
            className="bg-slate-800 border-slate-700 text-white h-20"
          />
        </FormGroup>
      </FormSection>

      {/* Ekonomi */}
      <FormSection title="Ekonomi & Fortnox">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormGroup label="Ordernummer">
            <Input
              value={formData.order_number}
              onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
              placeholder="T.ex. ORD-2025-001"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label="Fortnox Projektnr">
            <Input
              value={formData.fortnox_project_number || ''}
              onChange={(e) => setFormData({ ...formData, fortnox_project_number: e.target.value })}
              placeholder="T.ex. 1234"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>

          <FormGroup label="Fortnox Projektnamn">
            <Input
              value={formData.fortnox_project_name || ''}
              onChange={(e) => setFormData({ ...formData, fortnox_project_name: e.target.value })}
              placeholder="Projektnamn"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </FormGroup>
        </div>
      </FormSection>
    </>
  );
}