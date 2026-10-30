import Layout from "@/components/Layout";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import Destinations from "@/components/Destinations";
import Testimonials from "@/components/Testimonials";
import Features from "@/components/Features";
import CtaBanner from "@/components/CtaBanner";

export default function Index() {
  return (
    <Layout>
      <Hero />
      <Categories />
      <Destinations />
      <Testimonials />    
      <Features />
      <CtaBanner />      
    </Layout>
  );
}