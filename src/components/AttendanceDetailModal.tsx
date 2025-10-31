import { Calendar, Clock, MapPin, Camera, User, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFaceMatching, type FaceMatchResult } from "@/hooks/useFaceMatching";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  record: any;
}

export const AttendanceDetailModal = ({ isOpen, onClose, selectedDate, record }: AttendanceDetailModalProps) => {
  const { getMatchStatusIcon, getMatchStatusText } = useFaceMatching();
  const [baselinePhoto, setBaselinePhoto] = useState<string | null>(null);
  const [faceMatchResult, setFaceMatchResult] = useState<FaceMatchResult | null>(null);

  useEffect(() => {
    if (record?.rawRecord && isOpen) {
      fetchBaselinePhoto();
      performFaceMatch();
    }
  }, [record, isOpen]);

  const fetchBaselinePhoto = async () => {
    try {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('photo_url')
        .eq('user_id', record.rawRecord.user_id)
        .single();

      if (employeeData?.photo_url) {
        const { data } = supabase.storage
          .from('employee-photos')
          .getPublicUrl(employeeData.photo_url);
        setBaselinePhoto(data.publicUrl);
      }
    } catch (error) {
      console.error('Error fetching baseline photo:', error);
    }
  };

  const performFaceMatch = async () => {
    try {
      // Use actual face match data from the database
      if (!record?.rawRecord?.face_match_confidence) {
        setFaceMatchResult(null);
        return;
      }

      const confidence = record.rawRecord.face_match_confidence;
      const status = confidence >= 70 ? 'match' : confidence >= 40 ? 'partial' : 'nomatch';
      const color = status === 'match' ? 'green' : status === 'partial' ? 'amber' : 'red';

      setFaceMatchResult({ status, confidence, color });
    } catch (error) {
      console.error('Error performing face match:', error);
    }
  };

  if (!selectedDate || !record) return null;

  const attendancePhotoUrl = record.rawRecord?.check_in_photo_url 
    ? supabase.storage.from('attendance-photos').getPublicUrl(record.rawRecord.check_in_photo_url).data.publicUrl
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance Details - {new Date(selectedDate).toLocaleDateString('en-GB')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Check In Time:</span>
              </div>
              <p className="text-lg">{record.checkIn}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Check Out Time:</span>
              </div>
              <p className="text-lg">{record.checkOut}</p>
            </div>
          </div>

          {/* Total Hours */}
          <div className="space-y-2">
            <span className="font-medium">Total Hours Worked:</span>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {record.totalHours}
            </Badge>
          </div>

          {/* Location Details */}
          {record.rawRecord?.check_in_location && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Location Details:</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Latitude:</span>
                    <p className="font-mono">{record.rawRecord.check_in_location.latitude?.toFixed(6)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Longitude:</span>
                    <p className="font-mono">{record.rawRecord.check_in_location.longitude?.toFixed(6)}</p>
                  </div>
                </div>
                {record.rawRecord.check_in_address && (
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <p className="text-sm">{record.rawRecord.check_in_address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Face Match Section */}
          {(baselinePhoto || attendancePhotoUrl) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Face Verification:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {baselinePhoto && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Baseline Photo:</span>
                    <img 
                      src={baselinePhoto} 
                      alt="Baseline employee photo"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
                {attendancePhotoUrl && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Attendance Photo:</span>
                    <img 
                      src={attendancePhotoUrl} 
                      alt="Attendance photo"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
              {faceMatchResult && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getMatchStatusIcon(faceMatchResult)}
                    </span>
                    <div>
                      <p className="font-medium">{getMatchStatusText(faceMatchResult)}</p>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {faceMatchResult.confidence.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <span className="font-medium">Status:</span>
            <Badge variant={record.rawRecord?.status === 'present' ? 'default' : 'secondary'}>
              {record.rawRecord?.status || 'Unknown'}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};