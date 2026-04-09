import Hero from "@/components/sections/Hero";
import AuthorityStrip from "@/components/sections/AuthorityStrip";
import Capabilities from "@/components/sections/Capabilities";
import Process from "@/components/sections/Process";
import Showcase from "@/components/sections/Showcase";
import WhyTriseno from "@/components/sections/WhyTriseno";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <AuthorityStrip />
      <Capabilities />
      <Process />
      <Showcase />
      <WhyTriseno />
      <Contact />
    </>
  );
}
