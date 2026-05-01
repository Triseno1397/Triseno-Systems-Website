"use client";

import { useGSAPScroll } from "@/hooks/useGSAPScroll";
import PageCurtain from "@/components/web-design/PageCurtain";
import SlatTransition from "@/components/web-design/SlatTransition";
import HeroBrowserDollySection from "@/components/web-design/sections/HeroBrowserDollySection";
import VelocityTypeSection from "@/components/web-design/sections/VelocityTypeSection";
import BuildPipelineSection from "@/components/web-design/sections/BuildPipelineSection";
import ServiceScenesSection from "@/components/web-design/sections/ServiceScenesSection";
import ClosingArchitectSection from "@/components/web-design/sections/ClosingArchitectSection";

export default function WebDesignPageShell() {
  useGSAPScroll();

  return (
    <div className="wd-page relative">
      <PageCurtain />
      <SlatTransition
        triggerSelectors={[
          '[data-wd-section="velocity"]',
          '[data-wd-section="pipeline"]',
          '[data-wd-section="services"]',
          '[data-wd-section="closing"]',
        ]}
      />
      <HeroBrowserDollySection />
      <VelocityTypeSection />
      <BuildPipelineSection />
      <ServiceScenesSection />
      <ClosingArchitectSection />
    </div>
  );
}
