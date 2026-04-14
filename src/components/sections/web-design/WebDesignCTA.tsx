"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { fadeUp, staggerContainer } from "@/lib/animations";

export default function WebDesignCTA() {
  return (
    <section id="wd-contact" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[800px] mx-auto px-6 lg:px-8 text-center">
        {/* Background glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-400/[0.03] blur-[120px] pointer-events-none" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="relative"
        >
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(32px,5vw,56px)] font-bold tracking-[-0.03em] leading-[1.1] mb-5"
          >
            Ready to build
            <br />
            <span className="gradient-text">something real?</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="text-[17px] text-text-secondary leading-relaxed max-w-[500px] mx-auto mb-12"
          >
            Let&apos;s talk about your project. No templates, no fluff — just a
            conversation about what your business needs.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="primary" size="large" href="#contact">
              Get in Touch
            </Button>
            <Button variant="secondary" size="large" href="#wd-services">
              See Services
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
