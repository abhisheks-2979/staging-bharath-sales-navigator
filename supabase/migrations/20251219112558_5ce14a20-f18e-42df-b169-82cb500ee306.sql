-- Move all newly added retailers to Karkala 9 beat
UPDATE public.retailers 
SET beat_id = '5825b2a4-6f14-4f61-977b-d1a65f4e8ebe', 
    beat_name = 'Karkala 9'
WHERE user_id = 'd8a82c5b-0c24-489d-afbb-74a29aed2bf8' 
  AND beat_name = 'Bajagoli-Miyar';

-- Delete the unused Bajagoli-Miyar beat
DELETE FROM public.beats WHERE beat_id = 'bajagoli-miyar-001';