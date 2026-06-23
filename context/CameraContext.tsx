import React, { createContext, useState, ReactNode } from 'react';

type CameraFlowStep = 'capture' | 'preview' | 'filter' | 'send';

interface CameraContextProps {
  step: CameraFlowStep;
  setStep: React.Dispatch<React.SetStateAction<CameraFlowStep>>;

  capturedPhoto: any; // or a more specific type
  setCapturedPhoto: React.Dispatch<React.SetStateAction<any>>;

  video: { uri: string } | null;
  setVideo: React.Dispatch<React.SetStateAction<{ uri: string } | null>>;

  isPreviewVisible: boolean;
  setIsPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>;

  selectedFilter: string; // or number
  setSelectedFilter: (filterName: string) => void;
}

export const CameraContext = createContext<CameraContextProps>({
  step: 'capture',
  setStep: () => {},
  capturedPhoto: null,
  setCapturedPhoto: () => {},
  video: null,
  setVideo: () => {},
  isPreviewVisible: false,
  setIsPreviewVisible: () => {},
  selectedFilter: '',
  setSelectedFilter: () => {},
});

export const CameraProvider = ({ children }: { children: ReactNode }) => {
  const [step, setStep] = useState<CameraFlowStep>('capture');
  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);
  const [video, setVideo] = useState<{ uri: string } | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // for filters
  const [selectedFilter, setSelectedFilter] = useState<string>('Normal');

  return (
    <CameraContext.Provider
      value={{
        step,
        setStep,
        capturedPhoto,
        setCapturedPhoto,
        video,
        setVideo,
        isPreviewVisible,
        setIsPreviewVisible,
        selectedFilter,
        setSelectedFilter,
      }}
    >
      {children}
    </CameraContext.Provider>
  );
};
