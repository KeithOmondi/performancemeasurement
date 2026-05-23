import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchIndicatorById } from "../../store/slices/indicatorSlice";
import { Loader2 } from "lucide-react";
import IndicatorsPageIdModal from "../IndicatorsPageIdModal";

const SuperAdminIndicatorDetail = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { selectedIndicator, detailLoading } = useAppSelector(
    (state) => state.indicators
  );
  const { users } = useAppSelector((state) => state.users);

  useEffect(() => {
    if (id) dispatch(fetchIndicatorById(id));
  }, [id, dispatch]);

  if (detailLoading && !selectedIndicator) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  if (!selectedIndicator) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fdfcfc]">
        <p className="text-slate-400">Indicator not found</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-screen">
      <IndicatorsPageIdModal
        indicator={selectedIndicator}
        allStaff={users}
        onClose={() => navigate("/superadmin/indicators")}
      />
    </div>
  );
};

export default SuperAdminIndicatorDetail;