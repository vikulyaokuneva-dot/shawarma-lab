import { Benefits } from "@/components/Benefits";
import { Delivery } from "@/components/Delivery";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Menu } from "@/components/Menu";

export default function Home() {
  return (
    <>
      <Hero />
      <Menu />
      <Benefits />
      <HowItWorks />
      <Delivery />
    </>
  );
}
