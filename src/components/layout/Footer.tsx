import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Heart, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { to: "/rooms", label: t('hero.findRooms') },
    { to: "/mess", label: t('hero.findMess') },
    { to: "/owner-dashboard", label: "List Property" },
    { to: "/auth", label: "Login / Register" },
  ];

  const supportLinks = [
    { href: "#", label: "Help Center" },
    { href: "#", label: "Safety Information" },
    { href: "#", label: "FAQs" },
    { href: "#", label: t('footer.contact') },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-background to-muted/30 pt-20 pb-8 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6 lg:col-span-1"
          >
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl gradient-hero flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-300">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="font-heading font-bold text-xl text-foreground block">
                  Room<span className="text-primary">&</span>Mess
                </span>
                <span className="text-xs text-muted-foreground">Find your perfect place</span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              {t('hero.description')}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h4 className="font-heading font-semibold text-lg text-foreground mb-6">Explore</h4>
            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="font-heading font-semibold text-lg text-foreground mb-6">Support</h4>
            <ul className="space-y-4">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent/50 group-hover:bg-accent transition-colors" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h4 className="font-heading font-semibold text-lg text-foreground mb-6">{t('footer.contact')}</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground text-sm leading-relaxed">
                  123 Student Avenue, Near University, City - 110001
                </span>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <a href="tel:+919876543210" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <a href="mailto:support@roomandmess.com" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                  support@roomandmess.com
                </a>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="pt-8 border-t border-border/50"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              © {currentYear} Room&Mess. Made with
              <Heart className="w-4 h-4 text-destructive fill-destructive animate-heartbeat" />
              in India
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                {t('footer.privacy')}
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                {t('footer.terms')}
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors flex items-center gap-1">
                Sitemap
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
