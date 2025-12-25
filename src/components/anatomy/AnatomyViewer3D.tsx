import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  OrbitControls, 
  Text, 
  Box, 
  Sphere, 
  Cylinder, 
  Environment,
  ContactShadows,
  Float,
  Html,
  useTexture,
  useGLTF,
  Torus,
  Cone
} from "@react-three/drei";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  RotateCcw, 
  Zap, 
  Eye, 
  EyeOff, 
  Play, 
  Pause,
  Info,
  Layers,
  Move3D,
  Search
} from "lucide-react";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

interface AnatomyPart {
  id: string;
  name: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color: string;
  type: 'bone' | 'muscle' | 'joint' | 'organ' | 'ligament' | 'cartilage';
  info: string;
  connections?: string[];
  visible: boolean;
  opacity: number;
  size: [number, number, number];
}

const spineAnatomy: AnatomyPart[] = [
  { 
    id: 'c1', 
    name: 'C1 (Atlas)', 
    position: [0, 3.2, 0], 
    rotation: [0, 0, 0],
    scale: [1, 0.8, 1],
    color: '#4A90E2', 
    type: 'bone', 
    info: 'First cervical vertebra that supports the skull and allows nodding motion',
    visible: true,
    opacity: 0.9,
    size: [0.4, 0.3, 0.4]
  },
  { 
    id: 'c2', 
    name: 'C2 (Axis)', 
    position: [0, 2.8, 0], 
    rotation: [0, 0, 0],
    scale: [1, 0.9, 1],
    color: '#5BA3F5', 
    type: 'bone', 
    info: 'Second cervical vertebra with odontoid process, enables head rotation',
    visible: true,
    opacity: 0.9,
    size: [0.4, 0.35, 0.4]
  },
  { 
    id: 'c7', 
    name: 'C7 (Vertebra Prominens)', 
    position: [0, 1.5, 0], 
    rotation: [0, 0, 0],
    color: '#6BB6FF', 
    type: 'bone', 
    info: 'Seventh cervical vertebra with prominent spinous process, easily palpable',
    visible: true,
    opacity: 0.9,
    size: [0.45, 0.4, 0.45]
  },
  { 
    id: 't1', 
    name: 'T1', 
    position: [0, 1.1, 0], 
    rotation: [0, 0, 0],
    color: '#E74C3C', 
    type: 'bone', 
    info: 'First thoracic vertebra, transition from cervical to thoracic spine',
    visible: true,
    opacity: 0.9,
    size: [0.5, 0.4, 0.5]
  },
  { 
    id: 't6', 
    name: 'T6', 
    position: [0, 0, 0], 
    rotation: [0, 0, 0],
    color: '#C0392B', 
    type: 'bone', 
    info: 'Sixth thoracic vertebra, mid-thoracic region',
    visible: true,
    opacity: 0.9,
    size: [0.5, 0.45, 0.5]
  },
  { 
    id: 't12', 
    name: 'T12', 
    position: [0, -1.1, 0], 
    rotation: [0, 0, 0],
    color: '#A93226', 
    type: 'bone', 
    info: 'Twelfth thoracic vertebra, transition to lumbar spine',
    visible: true,
    opacity: 0.9,
    size: [0.55, 0.45, 0.55]
  },
  { 
    id: 'l1', 
    name: 'L1', 
    position: [0, -1.5, 0], 
    rotation: [0, 0, 0],
    color: '#27AE60', 
    type: 'bone', 
    info: 'First lumbar vertebra, largest vertebrae for weight bearing',
    visible: true,
    opacity: 0.9,
    size: [0.6, 0.5, 0.6]
  },
  { 
    id: 'l3', 
    name: 'L3', 
    position: [0, -2.1, 0], 
    rotation: [0, 0, 0],
    color: '#2ECC71', 
    type: 'bone', 
    info: 'Third lumbar vertebra, mid-lumbar region',
    visible: true,
    opacity: 0.9,
    size: [0.65, 0.55, 0.65]
  },
  { 
    id: 'l5', 
    name: 'L5', 
    position: [0, -2.7, 0], 
    rotation: [0, 0, 0],
    color: '#58D68D', 
    type: 'bone', 
    info: 'Fifth lumbar vertebra, articulates with sacrum',
    visible: true,
    opacity: 0.9,
    size: [0.7, 0.6, 0.7]
  },
  { 
    id: 'sacrum', 
    name: 'Sacrum', 
    position: [0, -3.3, 0], 
    rotation: [0, 0, 0],
    scale: [1, 1.2, 0.8],
    color: '#F39C12', 
    type: 'bone', 
    info: 'Triangular bone formed by fusion of 5 sacral vertebrae',
    visible: true,
    opacity: 0.9,
    size: [0.8, 0.7, 0.5]
  },
  // Add muscles and ligaments
  { 
    id: 'erector_spinae', 
    name: 'Erector Spinae', 
    position: [-0.4, 0, -0.3], 
    rotation: [0, 0, 0.1],
    color: '#E67E22', 
    type: 'muscle', 
    info: 'Deep back muscles that extend and maintain spinal posture',
    visible: true,
    opacity: 0.7,
    size: [0.2, 4, 0.3]
  },
  { 
    id: 'multifidus', 
    name: 'Multifidus', 
    position: [0.3, 0, -0.2], 
    rotation: [0, 0, -0.1],
    color: '#D35400', 
    type: 'muscle', 
    info: 'Deep stabilizing muscles of the spine',
    visible: true,
    opacity: 0.6,
    size: [0.15, 3.5, 0.2]
  },
  {
    id: 'anterior_longitudinal',
    name: 'Anterior Longitudinal Ligament',
    position: [0, 0, 0.4],
    color: '#F7DC6F',
    type: 'ligament',
    info: 'Prevents hyperextension of the spine',
    visible: true,
    opacity: 0.8,
    size: [0.1, 5, 0.05]
  }
];

const kneeAnatomy: AnatomyPart[] = [
  { 
    id: 'femur', 
    name: 'Femur', 
    position: [0, 1.5, 0], 
    rotation: [0, 0, 0],
    color: '#3498DB', 
    type: 'bone', 
    info: 'Thighbone - longest and strongest bone in the human body',
    visible: true,
    opacity: 0.9,
    size: [0.3, 2, 0.3]
  },
  { 
    id: 'tibia', 
    name: 'Tibia', 
    position: [-0.1, -1.5, 0], 
    rotation: [0, 0, 0],
    color: '#2980B9', 
    type: 'bone', 
    info: 'Shinbone - main weight-bearing bone of the lower leg',
    visible: true,
    opacity: 0.9,
    size: [0.25, 2, 0.25]
  },
  { 
    id: 'fibula', 
    name: 'Fibula', 
    position: [0.3, -1.5, 0], 
    rotation: [0, 0, 0],
    color: '#5DADE2', 
    type: 'bone', 
    info: 'Smaller bone parallel to tibia, provides muscle attachment',
    visible: true,
    opacity: 0.9,
    size: [0.15, 1.8, 0.15]
  },
  { 
    id: 'patella', 
    name: 'Patella', 
    position: [0, 0.2, 0.4], 
    rotation: [0, 0, 0],
    color: '#E74C3C', 
    type: 'bone', 
    info: 'Kneecap - sesamoid bone that protects the knee joint',
    visible: true,
    opacity: 0.9,
    size: [0.25, 0.3, 0.15]
  },
  { 
    id: 'acl', 
    name: 'ACL', 
    position: [-0.05, 0, 0.1], 
    rotation: [0.3, 0, 0],
    color: '#F1C40F', 
    type: 'ligament', 
    info: 'Anterior Cruciate Ligament - prevents forward displacement of tibia',
    visible: true,
    opacity: 0.8,
    size: [0.05, 0.4, 0.05]
  },
  { 
    id: 'pcl', 
    name: 'PCL', 
    position: [0.05, 0, -0.1], 
    rotation: [-0.3, 0, 0],
    color: '#E67E22', 
    type: 'ligament', 
    info: 'Posterior Cruciate Ligament - prevents backward displacement of tibia',
    visible: true,
    opacity: 0.8,
    size: [0.05, 0.4, 0.05]
  },
  { 
    id: 'medial_meniscus', 
    name: 'Medial Meniscus', 
    position: [-0.15, 0, 0], 
    rotation: [0, 0, 0],
    color: '#27AE60', 
    type: 'cartilage', 
    info: 'C-shaped cartilage that cushions the knee joint',
    visible: true,
    opacity: 0.7,
    size: [0.2, 0.05, 0.15]
  },
  { 
    id: 'lateral_meniscus', 
    name: 'Lateral Meniscus', 
    position: [0.15, 0, 0], 
    rotation: [0, 0, 0],
    color: '#2ECC71', 
    type: 'cartilage', 
    info: 'O-shaped cartilage that cushions the knee joint',
    visible: true,
    opacity: 0.7,
    size: [0.18, 0.05, 0.15]
  },
  {
    id: 'quadriceps',
    name: 'Quadriceps',
    position: [0, 1.5, 0.3],
    color: '#8E44AD',
    type: 'muscle',
    info: 'Four-headed muscle that extends the knee',
    visible: true,
    opacity: 0.6,
    size: [0.4, 1.5, 0.3]
  },
  {
    id: 'hamstrings',
    name: 'Hamstrings',
    position: [0, 1.5, -0.3],
    color: '#9B59B6',
    type: 'muscle',
    info: 'Three muscles that flex the knee',
    visible: true,
    opacity: 0.6,
    size: [0.35, 1.4, 0.25]
  }
];

const shoulderAnatomy: AnatomyPart[] = [
  { 
    id: 'humerus', 
    name: 'Humerus', 
    position: [0, -1.2, 0], 
    rotation: [0, 0, 0],
    color: '#3498DB', 
    type: 'bone', 
    info: 'Upper arm bone that forms the shoulder joint',
    visible: true,
    opacity: 0.9,
    size: [0.25, 2, 0.25]
  },
  { 
    id: 'scapula', 
    name: 'Scapula', 
    position: [-0.7, 0.3, -0.4], 
    rotation: [0, 0.3, 0.2],
    color: '#2980B9', 
    type: 'bone', 
    info: 'Shoulder blade that provides muscle attachment',
    visible: true,
    opacity: 0.9,
    size: [0.5, 0.8, 0.1]
  },
  { 
    id: 'clavicle', 
    name: 'Clavicle', 
    position: [0, 1.2, 0], 
    rotation: [0, 0, 0],
    color: '#5DADE2', 
    type: 'bone', 
    info: 'Collarbone that connects arm to trunk',
    visible: true,
    opacity: 0.9,
    size: [1.5, 0.15, 0.15]
  },
  { 
    id: 'deltoid', 
    name: 'Deltoid', 
    position: [0, 0.2, 0], 
    rotation: [0, 0, 0],
    color: '#E74C3C', 
    type: 'muscle', 
    info: 'Primary shoulder muscle for arm abduction',
    visible: true,
    opacity: 0.7,
    size: [0.6, 0.8, 0.6]
  },
  { 
    id: 'supraspinatus', 
    name: 'Supraspinatus', 
    position: [-0.3, 0.5, -0.2], 
    rotation: [0, 0.2, 0],
    color: '#F39C12', 
    type: 'muscle', 
    info: 'Rotator cuff muscle that initiates arm abduction',
    visible: true,
    opacity: 0.8,
    size: [0.3, 0.15, 0.2]
  },
  { 
    id: 'infraspinatus', 
    name: 'Infraspinatus', 
    position: [-0.4, 0.2, -0.3], 
    rotation: [0, 0.3, 0],
    color: '#E67E22', 
    type: 'muscle', 
    info: 'Rotator cuff muscle for external rotation',
    visible: true,
    opacity: 0.8,
    size: [0.25, 0.2, 0.15]
  },
  { 
    id: 'subscapularis', 
    name: 'Subscapularis', 
    position: [-0.5, 0.1, -0.1], 
    rotation: [0, 0.2, 0],
    color: '#D35400', 
    type: 'muscle', 
    info: 'Rotator cuff muscle for internal rotation',
    visible: true,
    opacity: 0.8,
    size: [0.2, 0.3, 0.1]
  },
  { 
    id: 'teres_minor', 
    name: 'Teres Minor', 
    position: [-0.3, -0.1, -0.25], 
    rotation: [0, 0.4, 0],
    color: '#A0522D', 
    type: 'muscle', 
    info: 'Small rotator cuff muscle for external rotation',
    visible: true,
    opacity: 0.8,
    size: [0.15, 0.1, 0.1]
  }
];

// Head/Skull Anatomy
const headAnatomy: AnatomyPart[] = [
  { id: 'skull', name: 'Skull', position: [0, 0.5, 0], color: '#E8E8E8', type: 'bone', 
    info: 'Cranium protecting the brain', visible: true, opacity: 0.9, size: [0.8, 1, 0.7] },
  { id: 'mandible', name: 'Mandible (Jaw)', position: [0, -0.5, 0.1], color: '#D0D0D0', type: 'bone',
    info: 'Lower jaw bone for chewing', visible: true, opacity: 0.9, size: [0.6, 0.3, 0.4] },
  { id: 'temporal', name: 'Temporal Bone', position: [0.6, 0.2, 0], color: '#C8C8C8', type: 'bone',
    info: 'Skull bone housing ear structures', visible: true, opacity: 0.9, size: [0.3, 0.4, 0.3] },
  { id: 'masseter', name: 'Masseter Muscle', position: [0.4, -0.3, 0], color: '#E74C3C', type: 'muscle',
    info: 'Primary chewing muscle', visible: true, opacity: 0.7, size: [0.2, 0.3, 0.2] },
  { id: 'temporalis', name: 'Temporalis', position: [0.5, 0.3, -0.1], color: '#C0392B', type: 'muscle',
    info: 'Powerful jaw elevator muscle', visible: true, opacity: 0.7, size: [0.25, 0.4, 0.15] }
];

// Pelvis Anatomy
const pelvisAnatomy: AnatomyPart[] = [
  { id: 'ilium', name: 'Ilium', position: [0.6, 0.5, 0], color: '#3498DB', type: 'bone',
    info: 'Upper part of hip bone', visible: true, opacity: 0.9, size: [0.5, 0.6, 0.3] },
  { id: 'sacrum_pelvis', name: 'Sacrum', position: [0, 0, -0.2], color: '#2980B9', type: 'bone',
    info: 'Fused vertebrae connecting spine to pelvis', visible: true, opacity: 0.9, size: [0.7, 0.8, 0.4] },
  { id: 'pubis', name: 'Pubis', position: [0.3, -0.5, 0.2], color: '#5DADE2', type: 'bone',
    info: 'Front portion of hip bone', visible: true, opacity: 0.9, size: [0.4, 0.3, 0.2] },
  { id: 'ischium', name: 'Ischium', position: [0.4, -0.6, -0.1], color: '#85C1E9', type: 'bone',
    info: 'Lower and back part of hip bone', visible: true, opacity: 0.9, size: [0.35, 0.4, 0.25] },
  { id: 'gluteus_maximus', name: 'Gluteus Maximus', position: [-0.5, 0, -0.5], color: '#E74C3C', type: 'muscle',
    info: 'Largest buttock muscle for hip extension', visible: true, opacity: 0.7, size: [0.6, 0.7, 0.4] },
  { id: 'iliopsoas', name: 'Iliopsoas', position: [0.3, 0.2, 0.1], color: '#C0392B', type: 'muscle',
    info: 'Hip flexor muscle group', visible: true, opacity: 0.7, size: [0.3, 0.5, 0.2] }
];

// Hand/Wrist Anatomy
const handAnatomy: AnatomyPart[] = [
  { id: 'radius', name: 'Radius', position: [-0.3, 0.8, 0], color: '#3498DB', type: 'bone',
    info: 'Lateral forearm bone', visible: true, opacity: 0.9, size: [0.15, 1.2, 0.15] },
  { id: 'ulna', name: 'Ulna', position: [0.3, 0.8, 0], color: '#2980B9', type: 'bone',
    info: 'Medial forearm bone', visible: true, opacity: 0.9, size: [0.15, 1.3, 0.15] },
  { id: 'carpals', name: 'Carpal Bones', position: [0, 0, 0], color: '#5DADE2', type: 'bone',
    info: 'Eight small wrist bones', visible: true, opacity: 0.9, size: [0.5, 0.3, 0.3] },
  { id: 'metacarpals', name: 'Metacarpals', position: [0, -0.5, 0], color: '#85C1E9', type: 'bone',
    info: 'Five bones in palm of hand', visible: true, opacity: 0.9, size: [0.6, 0.4, 0.15] },
  { id: 'phalanges_hand', name: 'Phalanges (Fingers)', position: [0, -1.2, 0], color: '#AED6F1', type: 'bone',
    info: 'Finger bones - 14 total', visible: true, opacity: 0.9, size: [0.5, 0.8, 0.1] },
  { id: 'flexor_digitorum', name: 'Flexor Digitorum', position: [0, 0.5, 0.2], color: '#E67E22', type: 'muscle',
    info: 'Finger flexor muscles', visible: true, opacity: 0.7, size: [0.3, 0.8, 0.2] }
];

// Foot/Ankle Anatomy  
const footAnatomy: AnatomyPart[] = [
  { id: 'talus', name: 'Talus', position: [0, 0.3, 0], color: '#3498DB', type: 'bone',
    info: 'Ankle bone connecting leg to foot', visible: true, opacity: 0.9, size: [0.3, 0.2, 0.4] },
  { id: 'calcaneus', name: 'Calcaneus (Heel)', position: [0, -0.2, -0.3], color: '#2980B9', type: 'bone',
    info: 'Largest foot bone, forms heel', visible: true, opacity: 0.9, size: [0.35, 0.4, 0.5] },
  { id: 'navicular', name: 'Navicular', position: [0, 0, 0.3], color: '#5DADE2', type: 'bone',
    info: 'Boat-shaped midfoot bone', visible: true, opacity: 0.9, size: [0.25, 0.15, 0.2] },
  { id: 'metatarsals', name: 'Metatarsals', position: [0, -0.1, 0.8], color: '#85C1E9', type: 'bone',
    info: 'Five long bones of the foot', visible: true, opacity: 0.9, size: [0.5, 0.15, 0.7] },
  { id: 'phalanges_foot', name: 'Phalanges (Toes)', position: [0, -0.15, 1.4], color: '#AED6F1', type: 'bone',
    info: 'Toe bones - 14 total', visible: true, opacity: 0.9, size: [0.45, 0.1, 0.5] },
  { id: 'achilles', name: 'Achilles Tendon', position: [0, 0.5, -0.4], color: '#F1C40F', type: 'ligament',
    info: 'Strongest tendon in the body', visible: true, opacity: 0.8, size: [0.15, 0.6, 0.1] },
  { id: 'gastrocnemius', name: 'Gastrocnemius', position: [0, 1.2, -0.2], color: '#E74C3C', type: 'muscle',
    info: 'Calf muscle for plantar flexion', visible: true, opacity: 0.7, size: [0.4, 0.8, 0.3] }
];

// Thorax/Chest Anatomy
const thoraxAnatomy: AnatomyPart[] = [
  { id: 'sternum', name: 'Sternum', position: [0, 0, 0.4], color: '#E8E8E8', type: 'bone',
    info: 'Breastbone in center of chest', visible: true, opacity: 0.9, size: [0.15, 0.8, 0.1] },
  { id: 'ribs', name: 'Ribs', position: [0.6, 0, 0], color: '#D0D0D0', type: 'bone',
    info: 'Twelve pairs protecting organs', visible: true, opacity: 0.9, size: [0.8, 1, 0.6] },
  { id: 'pectoralis_major', name: 'Pectoralis Major', position: [0.4, 0.2, 0.5], color: '#E74C3C', type: 'muscle',
    info: 'Large chest muscle', visible: true, opacity: 0.7, size: [0.5, 0.6, 0.3] },
  { id: 'intercostals', name: 'Intercostal Muscles', position: [0.5, 0, 0.2], color: '#C0392B', type: 'muscle',
    info: 'Muscles between ribs for breathing', visible: true, opacity: 0.6, size: [0.6, 0.8, 0.15] },
  { id: 'diaphragm', name: 'Diaphragm', position: [0, -0.6, 0], color: '#A93226', type: 'muscle',
    info: 'Primary breathing muscle', visible: true, opacity: 0.7, size: [0.9, 0.15, 0.7] }
];

// Elbow Anatomy
const elbowAnatomy: AnatomyPart[] = [
  { id: 'humerus_elbow', name: 'Humerus (Upper)', position: [0, 0.8, 0], color: '#3498DB', type: 'bone',
    info: 'Upper arm bone', visible: true, opacity: 0.9, size: [0.2, 1, 0.2] },
  { id: 'radius_elbow', name: 'Radius', position: [-0.15, -0.8, 0], color: '#2980B9', type: 'bone',
    info: 'Lateral forearm bone', visible: true, opacity: 0.9, size: [0.15, 1, 0.15] },
  { id: 'ulna_elbow', name: 'Ulna', position: [0.15, -0.8, -0.1], color: '#5DADE2', type: 'bone',
    info: 'Medial forearm bone with olecranon', visible: true, opacity: 0.9, size: [0.15, 1.1, 0.15] },
  { id: 'biceps', name: 'Biceps Brachii', position: [0, 0.6, 0.2], color: '#E74C3C', type: 'muscle',
    info: 'Arm flexor muscle', visible: true, opacity: 0.7, size: [0.25, 0.8, 0.25] },
  { id: 'triceps', name: 'Triceps', position: [0, 0.5, -0.25], color: '#C0392B', type: 'muscle',
    info: 'Arm extensor muscle', visible: true, opacity: 0.7, size: [0.25, 0.9, 0.25] },
  { id: 'ucl', name: 'UCL (Ulnar Collateral)', position: [0.15, 0, -0.05], color: '#F1C40F', type: 'ligament',
    info: 'Medial elbow ligament', visible: true, opacity: 0.8, size: [0.05, 0.25, 0.05] }
];

// Hip Anatomy
const hipAnatomy: AnatomyPart[] = [
  { id: 'femur_hip', name: 'Femur (Proximal)', position: [0, -0.8, 0], color: '#3498DB', type: 'bone',
    info: 'Thigh bone with ball joint', visible: true, opacity: 0.9, size: [0.25, 1.5, 0.25] },
  { id: 'acetabulum', name: 'Acetabulum', position: [0, 0.3, 0], color: '#2980B9', type: 'bone',
    info: 'Hip socket in pelvis', visible: true, opacity: 0.9, size: [0.5, 0.5, 0.4] },
  { id: 'femoral_head', name: 'Femoral Head', position: [0, 0.2, 0], color: '#5DADE2', type: 'bone',
    info: 'Ball of hip joint', visible: true, opacity: 0.9, size: [0.35, 0.35, 0.35] },
  { id: 'hip_labrum', name: 'Labrum', position: [0, 0.3, 0], color: '#27AE60', type: 'cartilage',
    info: 'Cartilage rim of hip socket', visible: true, opacity: 0.7, size: [0.55, 0.55, 0.45] },
  { id: 'gluteus_medius', name: 'Gluteus Medius', position: [-0.4, 0.4, -0.3], color: '#E74C3C', type: 'muscle',
    info: 'Hip abductor muscle', visible: true, opacity: 0.7, size: [0.4, 0.5, 0.3] },
  { id: 'hip_flexors', name: 'Hip Flexors', position: [0, 0.3, 0.3], color: '#C0392B', type: 'muscle',
    info: 'Muscles that flex the hip', visible: true, opacity: 0.7, size: [0.3, 0.6, 0.25] }
];

interface AnatomyPartMeshProps {
  part: AnatomyPart;
  isSelected: boolean;
  onClick: () => void;
  animationSpeed: number;
  showLabels: boolean;
}

const AnatomyPartMesh = ({ part, isSelected, onClick, animationSpeed, showLabels }: AnatomyPartMeshProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current && (isSelected || hovered)) {
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * animationSpeed) * 0.1;
    }
  });

  if (!part.visible) return null;

  const getGeometry = () => {
    const [width, height, depth] = part.size;
    switch (part.type) {
      case 'bone':
        return <Box args={[width, height, depth]} />;
      case 'muscle':
        return <Sphere args={[Math.max(width, height, depth) * 0.8]} />;
      case 'joint':
      case 'ligament':
        return <Cylinder args={[width * 0.5, width * 0.5, height]} />;
      case 'cartilage':
        return <Torus args={[width * 0.4, width * 0.1]} />;
      default:
        return <Box args={[width, height, depth]} />;
    }
  };

  const materialProps = {
    color: isSelected ? '#FF6B6B' : hovered ? '#4ECDC4' : part.color,
    opacity: Math.min(part.opacity * (hovered ? 1 : 1), 1),
    transparent: part.opacity < 1,
    roughness: 0.3,
    metalness: 0.2,
    emissive: isSelected ? '#FF2222' : hovered ? '#1A4444' : '#000000',
    emissiveIntensity: isSelected ? 0.3 : hovered ? 0.15 : 0,
    side: THREE.DoubleSide
  };

  return (
    <Float
      speed={animationSpeed * 0.5}
      rotationIntensity={isSelected ? 0.3 : 0.1}
      floatIntensity={isSelected ? 0.2 : 0.05}
    >
      <group 
        ref={meshRef}
        position={part.position} 
        rotation={part.rotation || [0, 0, 0]}
        scale={part.scale || [1, 1, 1]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <mesh castShadow receiveShadow>
          {getGeometry()}
          <meshStandardMaterial {...materialProps} />
        </mesh>
        
        {showLabels && (hovered || isSelected) && (
          <Html
            position={[0, (part.size[1] / 2) + 0.3, 0]}
            center
            distanceFactor={10}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            {part.name}
          </Html>
        )}
      </group>
    </Float>
  );
};

// External GLTF model renderer from Supabase Storage URL
const ExternalModel = ({ url }: { url: string }) => {
  const gltf = useGLTF(url) as any;
  return (
    <group position={[0, 0, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
};

interface AnatomySceneProps {
  anatomy: AnatomyPart[];
  selectedPart: string | null;
  onPartSelect: (partId: string) => void;
  animationSpeed: number;
  showLabels: boolean;
  environmentPreset: string;
  modelUrl?: string | null;
}

const AnatomyScene = ({ anatomy, selectedPart, onPartSelect, animationSpeed, showLabels, environmentPreset, modelUrl }: AnatomySceneProps) => {
  const { camera } = useThree();
  
  useEffect(() => {
    if (selectedPart) {
      const part = anatomy.find(p => p.id === selectedPart);
      if (part) {
        camera.lookAt(new THREE.Vector3(...part.position));
      }
    }
  }, [selectedPart, anatomy, camera]);

  return (
    <>
      <Environment preset={environmentPreset as any} background={false} />
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <pointLight position={[-10, -10, -5]} intensity={0.4} color="#4A90E2" />
      
      <ContactShadows
        opacity={0.4}
        scale={20}
        blur={1}
        far={10}
        resolution={256}
        color="#000000"
      />
      
      <OrbitControls 
        enablePan 
        enableZoom 
        enableRotate 
        autoRotate={false}
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI}
        minDistance={2}
        maxDistance={15}
      />
      
      {modelUrl ? (
        <Suspense fallback={
          <Html center>
            <div className="text-xs px-3 py-2 rounded bg-muted text-foreground">Loading external 3D model...</div>
          </Html>
        }>
          <ExternalModel url={modelUrl} />
        </Suspense>
      ) : (
        anatomy.map((part) => (
          <AnatomyPartMesh
            key={part.id}
            part={part}
            isSelected={selectedPart === part.id}
            onClick={() => onPartSelect(part.id)}
            animationSpeed={animationSpeed}
            showLabels={showLabels}
          />
        ))
      )}
    </>
  );
};

const LayerControl = ({ anatomy, onToggleVisibility, onOpacityChange }: {
  anatomy: AnatomyPart[];
  onToggleVisibility: (partId: string) => void;
  onOpacityChange: (partId: string, opacity: number) => void;
}) => {
  const groupedParts = anatomy.reduce((groups, part) => {
    if (!groups[part.type]) groups[part.type] = [];
    groups[part.type].push(part);
    return groups;
  }, {} as Record<string, AnatomyPart[]>);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Layers className="h-4 w-4" />
        Layer Controls
      </h3>
      {Object.entries(groupedParts).map(([type, parts]) => (
        <div key={type} className="space-y-2">
          <h4 className="text-sm font-medium capitalize text-muted-foreground">{type}s</h4>
          {parts.map(part => (
            <div key={part.id} className="flex items-center justify-between space-x-2 p-2 rounded border">
              <div className="flex items-center space-x-2 flex-1">
                <Switch
                  checked={part.visible}
                  onCheckedChange={() => onToggleVisibility(part.id)}
                />
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: part.color }}
                  />
                  <span className="text-xs font-medium">{part.name}</span>
                </div>
              </div>
              <div className="w-16">
                <Slider
                  value={[part.opacity * 100]}
                  onValueChange={([value]) => onOpacityChange(part.id, value / 100)}
                  max={100}
                  step={10}
                  className="w-full"
                  disabled={!part.visible}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const AnatomyViewer3D = () => {
  const { hasAccess } = useSubscription();
  const [selectedRegion, setSelectedRegion] = useState<'spine' | 'knee' | 'shoulder' | 'head' | 'pelvis' | 'hand' | 'foot' | 'thorax' | 'elbow' | 'hip'>('spine');
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [anatomy, setAnatomy] = useState<AnatomyPart[]>(spineAnatomy);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [environmentPreset, setEnvironmentPreset] = useState('city');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Check if user has premium access (Basic tier or higher)
  const hasPremiumAccess = hasAccess('basic');

  useEffect(() => {
    switch (selectedRegion) {
      case 'spine':
        setAnatomy([...spineAnatomy]);
        break;
      case 'knee':
        setAnatomy([...kneeAnatomy]);
        break;
      case 'shoulder':
        setAnatomy([...shoulderAnatomy]);
        break;
      case 'head':
        setAnatomy([...headAnatomy]);
        break;
      case 'pelvis':
        setAnatomy([...pelvisAnatomy]);
        break;
      case 'hand':
        setAnatomy([...handAnatomy]);
        break;
      case 'foot':
        setAnatomy([...footAnatomy]);
        break;
      case 'thorax':
        setAnatomy([...thoraxAnatomy]);
        break;
      case 'elbow':
        setAnatomy([...elbowAnatomy]);
        break;
      case 'hip':
        setAnatomy([...hipAnatomy]);
        break;
    }
    setSelectedPart(null);
    setModelUrl(null);

    // Try to load external GLTF/GLB model from Supabase Storage
    const fetchModel = async () => {
      try {
        const bucket = supabase.storage.from('anatomy-models');
        const base = selectedRegion;
        const tryFile = async (path: string) => {
          const { data, error } = await bucket.createSignedUrl(path, 3600);
          if (!error && data?.signedUrl) return data.signedUrl;
          return null;
        };
        let url = await tryFile(`${base}.glb`);
        if (!url) url = await tryFile(`${base}.gltf`);
        if (!url) url = await tryFile(`${base}/${base}.glb`);
        setModelUrl(url);
      } catch (e) {
        setModelUrl(null);
      }
    };
    fetchModel();
  }, [selectedRegion]);

  // Preload model for smoother display when available
  useEffect(() => {
    if (modelUrl) {
      try {
        // @ts-ignore - drei attaches preload
        useGLTF.preload(modelUrl);
      } catch {}
    }
  }, [modelUrl]);

  const selectedPartData = selectedPart 
    ? anatomy.find(part => part.id === selectedPart)
    : null;

  const resetView = () => {
    setSelectedPart(null);
  };

  const toggleVisibility = (partId: string) => {
    setAnatomy(prev => prev.map(part => 
      part.id === partId ? { ...part, visible: !part.visible } : part
    ));
  };

  const updateOpacity = (partId: string, opacity: number) => {
    setAnatomy(prev => prev.map(part => 
      part.id === partId ? { ...part, opacity } : part
    ));
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadError(null);
      const fileName = file.name.toLowerCase();
      const ext = fileName.endsWith('.gltf') ? 'gltf' : 'glb';
      const path = `${selectedRegion}.${ext}`;
      const contentType = ext === 'glb' ? 'model/gltf-binary' : 'model/gltf+json';
      const { error: upErr } = await supabase.storage
        .from('anatomy-models')
        .upload(path, file, { upsert: true, contentType });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from('anatomy-models')
        .createSignedUrl(path, 3600);
      setModelUrl(signed?.signedUrl || null);
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const seedDemo = async () => {
    try {
      setUploading(true);
      setUploadError(null);
      const { error } = await supabase.functions.invoke('seed-anatomy-models', {
        body: { regions: [selectedRegion] },
      });
      if (error) throw error as any;
      const exts = ['glb', 'gltf'] as const;
      for (const ext of exts) {
        const { data: signed } = await supabase.storage
          .from('anatomy-models')
          .createSignedUrl(`${selectedRegion}.${ext}`, 3600);
        if (signed?.signedUrl) {
          setModelUrl(signed.signedUrl);
          break;
        }
      }
    } catch (e: any) {
      setUploadError(e?.message || 'Seeding failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredAnatomy = anatomy.filter(part =>
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Move3D className="h-6 w-6 text-primary" />
            Advanced 3D Anatomy Explorer
          </CardTitle>
          <CardDescription>
            Interactive anatomical visualization with realistic 3D models and advanced controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Body Region</Label>
              <Select value={selectedRegion} onValueChange={(value: any) => {
                setSelectedRegion(value);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spine">Spine & Back</SelectItem>
                  <SelectItem value="knee">Knee Joint</SelectItem>
                  <SelectItem value="shoulder">Shoulder Complex</SelectItem>
                  <SelectItem value="head">Head & Skull</SelectItem>
                  <SelectItem value="pelvis">Pelvis & Hip Bone</SelectItem>
                  <SelectItem value="hand">Hand & Wrist</SelectItem>
                  <SelectItem value="foot">Foot & Ankle</SelectItem>
                  <SelectItem value="thorax">Thorax & Chest</SelectItem>
                  <SelectItem value="elbow">Elbow Joint</SelectItem>
                  <SelectItem value="hip">Hip Joint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={environmentPreset} onValueChange={setEnvironmentPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="city">Medical City</SelectItem>
                  <SelectItem value="studio">Clean Studio</SelectItem>
                  <SelectItem value="forest">Natural Forest</SelectItem>
                  <SelectItem value="sunset">Warm Sunset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Animation Speed</Label>
              <Slider
                value={[animationSpeed]}
                onValueChange={([value]) => setAnimationSpeed(value)}
                min={0}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-4">
              <Button onClick={resetView} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                />
                <Label className="text-sm">Labels</Label>
              </div>
            </div>
          </div>

          <Tabs defaultValue="viewer" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="viewer">3D Viewer</TabsTrigger>
              <TabsTrigger value="zygote">Zygote Body</TabsTrigger>
              <TabsTrigger value="layers">Layer Control</TabsTrigger>
              <TabsTrigger value="info">Information</TabsTrigger>
            </TabsList>

            <TabsContent value="viewer" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 3D Viewer */}
                <div className="lg:col-span-3">
                  <div className="h-[600px] w-full border rounded-lg bg-gradient-to-b from-background to-muted/20 overflow-hidden">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4">
                          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                          <p className="text-sm text-muted-foreground">Loading 3D anatomy...</p>
                        </div>
                      </div>
                    }>
                      <Canvas 
                        camera={{ position: [0, 0, 8], fov: 50 }}
                        shadows
                        dpr={[1, 2]}
                        gl={{ 
                          antialias: true, 
                          alpha: false,
                          preserveDrawingBuffer: true,
                          powerPreference: "high-performance"
                        }}
                      >
                        <color attach="background" args={['#1a1a2e']} />
                        <fog attach="fog" args={['#1a1a2e', 10, 25]} />
                        <AnatomyScene
                          anatomy={anatomy}
                          selectedPart={selectedPart}
                          onPartSelect={setSelectedPart}
                          animationSpeed={animationSpeed}
                          showLabels={showLabels}
                          environmentPreset={environmentPreset}
                          modelUrl={modelUrl}
                        />
                      </Canvas>
                    </Suspense>
                  </div>
                  {!modelUrl && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm mb-2">No external 3D model found for “{selectedRegion}”. Upload a .glb or .gltf file or load a demo model.</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept=".glb,.gltf"
                          onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
                          disabled={uploading}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={seedDemo} disabled={uploading}>
                          {uploading ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Seeding...
                            </span>
                          ) : (
                            'Load Demo Model'
                          )}
                        </Button>
                      </div>
                      {uploadError && <p className="text-xs text-destructive mt-2">{uploadError}</p>}
                    </div>
                  )}
                  <div className="mt-4 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      🖱️ Click & drag to rotate • 🖱️ Scroll to zoom • 👆 Click structures for details
                    </p>
                    <div className="flex justify-center space-x-4 text-xs text-muted-foreground">
                      <span>Structures: {anatomy.filter(p => p.visible).length}/{anatomy.length}</span>
                      <span>Selected: {selectedPartData?.name || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Controls */}
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search structures..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Anatomical Structures</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredAnatomy.map((part) => (
                        <div
                          key={part.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                            selectedPart === part.id
                              ? 'border-primary bg-primary/10 shadow-md'
                              : part.visible
                              ? 'border-muted hover:border-primary/50 hover:bg-primary/5'
                              : 'border-muted/50 opacity-50'
                          }`}
                          onClick={() => setSelectedPart(part.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full shadow-sm"
                                style={{ backgroundColor: part.color }}
                              />
                              <div>
                                <span className="text-sm font-medium">{part.name}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {part.type}
                                  </Badge>
                                  {!part.visible && (
                                    <EyeOff className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="zygote" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Zygote Body 3D Human Anatomy</span>
                    {hasPremiumAccess && (
                      <Badge variant="default" className="ml-2">Premium Features Enabled</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Interactive full-body anatomy viewer powered by Zygote Body
                    {!hasPremiumAccess && (
                      <span className="block mt-2 text-primary">
                        • Subscribe to Basic plan (£3.99/month) to unlock ZygoteBody Premium features
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[600px] border rounded-lg overflow-hidden bg-background">
                    <iframe
                      src={hasPremiumAccess 
                        ? "https://www.zygotebody.com/#premium=true" 
                        : "https://www.zygotebody.com"}
                      className="w-full h-full"
                      title="Zygote Body 3D Anatomy Viewer"
                      allowFullScreen
                    />
                  </div>
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2">
                    <p className="text-sm text-muted-foreground">
                      💡 Use the controls within the Zygote Body viewer to explore detailed 3D human anatomy.
                      You can rotate, zoom, and toggle different anatomical systems.
                    </p>
                    {hasPremiumAccess ? (
                      <p className="text-sm font-medium text-primary">
                        ✨ Premium features active: Advanced layers, detailed annotations, and enhanced visualization
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        🔒 Subscribe to access premium ZygoteBody features including advanced anatomical layers and detailed annotations
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="layers" className="space-y-4">
              <LayerControl
                anatomy={anatomy}
                onToggleVisibility={toggleVisibility}
                onOpacityChange={updateOpacity}
              />
            </TabsContent>

            <TabsContent value="info" className="space-y-4">
              {selectedPartData ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: selectedPartData.color }}
                          />
                          {selectedPartData.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="capitalize">
                            {selectedPartData.type}
                          </Badge>
                          <Badge variant="outline">
                            {selectedPartData.visible ? 'Visible' : 'Hidden'}
                          </Badge>
                        </div>
                      </div>
                      <Info className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedPartData.info}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Position:</span>
                        <p className="text-muted-foreground">
                          X: {selectedPartData.position[0].toFixed(1)}<br/>
                          Y: {selectedPartData.position[1].toFixed(1)}<br/>
                          Z: {selectedPartData.position[2].toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Properties:</span>
                        <p className="text-muted-foreground">
                          Opacity: {Math.round(selectedPartData.opacity * 100)}%<br/>
                          Visible: {selectedPartData.visible ? 'Yes' : 'No'}<br/>
                          Type: {selectedPartData.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={() => toggleVisibility(selectedPartData.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        {selectedPartData.visible ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Show
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setSelectedPart(null)}
                        variant="outline"
                        size="sm"
                      >
                        Deselect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Structure Selected</h3>
                    <p className="text-muted-foreground">
                      Click on any anatomical structure in the 3D viewer or structure list to view detailed information.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};