import React from "react";
import Home from "./Home";
import Discord from "../Components/Discord";
import About from "./About";
import Carousel from "../Components/Carousel/Carousel";
import Button from "../Components/Button";
import Faculty from "../Components/Faculty";
import FAQ from "../Components/FAQ";
import Footer from "../Components/Footer";
import Timeline from "../Components/timeline";

const LandingPage = () => {
  return (
    <div>
      <Home></Home>
      <Discord></Discord>
      <About></About>
      <Faculty></Faculty>
      <Timeline></Timeline>
      <FAQ></FAQ>
      <Footer></Footer>
    </div>
  );
};

export default LandingPage;
