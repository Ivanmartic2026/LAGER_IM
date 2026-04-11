import { Truck, Phone, User, MapPin, Calendar } from "lucide-react";

const DELIVERY_LABELS = {
  truck: 'Lastbil', courier: 'Bud', pickup: 'Hämtas',
  air_freight: 'Flyg', sea_freight: 'Sjöfrakt', other: 'Annat'
};

function Row({ icon: Icon, label, value, href }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-white/40" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
        {href
          ? <a href={href} className="text-sm font-medium text-blue-400 hover:text-blue-300">{value}</a>
          : <p className="text-sm font-medium text-white whitespace-pre-wrap">{value}</p>
        }
      </div>
    </div>
  );
}

export default function DeliverySection({ workOrder, order }) {
  const wo = workOrder;
  const deliveryDate = wo.delivery_date || order?.delivery_date;
  const deliveryAddress = wo.delivery_address || order?.delivery_address;
  const deliveryMethod = wo.delivery_method || order?.delivery_method;
  const shippingCompany = order?.shipping_company;
  const contactName = wo.delivery_contact_name || order?.delivery_contact_name;
  const contactPhone = wo.delivery_contact_phone || order?.delivery_contact_phone;
  const techName = wo.technician_name;
  const techPhone = wo.technician_phone;

  const hasAny = deliveryDate || deliveryAddress || deliveryMethod || contactName || contactPhone || techName;
  if (!hasAny) return null;

  return (
    <div className="bg-black rounded-2xl border border-white/10 p-5">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Truck className="w-4 h-4 text-green-400" />
        Leverans &amp; Kontakt
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div>
          <Row icon={Calendar} label="Leveransdatum" value={deliveryDate ? new Date(deliveryDate).toLocaleDateString('sv-SE') : null} />
          <Row icon={MapPin} label="Leveransadress" value={deliveryAddress} />
          <Row icon={Truck} label="Leveranssätt" value={DELIVERY_LABELS[deliveryMethod] || deliveryMethod} />
          <Row icon={Truck} label="Speditör" value={shippingCompany} />
        </div>
        <div>
          <Row icon={User} label="Leveranskontakt" value={contactName} />
          <Row icon={Phone} label="Kontakttelefon" value={contactPhone} href={contactPhone ? `tel:${contactPhone}` : null} />
          <Row icon={User} label="Ansvarig tekniker" value={techName} />
          <Row icon={Phone} label="Teknikerns telefon" value={techPhone} href={techPhone ? `tel:${techPhone}` : null} />
        </div>
      </div>
    </div>
  );
}