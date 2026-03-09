interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  colorBorder?: string;
  isSmall?: boolean;
}

const StatCard = ({ label, value, subValue, colorBorder = "border-slate-200", isSmall }: StatCardProps) => (
  <div className={`bg-white p-4 rounded-md border-t-4 ${colorBorder} shadow-sm flex flex-col justify-between`}>
    <div>
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</h3>
      <p className={`${isSmall ? 'text-xl' : 'text-3xl'} font-bold text-slate-800 mt-1`}>{value}</p>
    </div>
    {subValue && <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase">{subValue}</p>}
  </div>
);

export default StatCard;