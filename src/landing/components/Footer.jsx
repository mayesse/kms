import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const socials = [
  { name: 'Facebook', icon: 'f' },
  { name: 'Twitter', icon: '𝕏' },
  { name: 'LinkedIn', icon: 'in' },
  { name: 'Instagram', icon: '📷' },
]

const productLinks = ['features', 'pricing', 'download', 'demo', 'industries']
const companyLinks = ['about', 'contact', 'privacy', 'terms']
const supportLinks = ['faq', 'docs', 'status']

export default function Footer() {
  const { t } = useTranslation()

  const linkClass = "text-sm text-gray-400 hover:text-emerald-400 transition-colors"

  return (
    <footer className="bg-gray-950 dark:bg-black border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{t('landing.footer.product')}</h3>
            <ul className="space-y-3">
              {productLinks.map((key) => (
                <li key={key}>
                  {key === 'pricing' || key === 'demo' || key === 'download' ? (
                    <Link to={key === 'pricing' ? '/app/auth/register' : key === 'download' ? '/download' : '/demo'} className={linkClass}>
                      {t(`landing.footer.${key}`)}
                    </Link>
                  ) : (
                    <a href={`#${key}`} className={linkClass}>
                      {t(`landing.footer.${key}`)}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{t('landing.footer.company')}</h3>
            <ul className="space-y-3">
              {companyLinks.map((key) => (
                <li key={key}>
                  {key === 'contact' ? (
                    <a href="#contact" className={linkClass}>{t('landing.footer.contact')}</a>
                  ) : (
                    <Link to={key === 'about' || key === 'privacy' || key === 'terms' ? '#' : '#'} className={linkClass}>
                      {t(`landing.footer.${key}`)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{t('landing.footer.support')}</h3>
            <ul className="space-y-3">
              {supportLinks.map((key) => (
                <li key={key}>
                  <a href={key === 'faq' ? '#faq' : '#'} className={linkClass}>
                    {t(`landing.footer.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{t('landing.footer.follow')}</h3>
            <div className="flex flex-wrap gap-3">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-emerald-600 flex items-center justify-center text-sm text-gray-300 hover:text-white transition-colors"
                  aria-label={s.name}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-sm text-gray-500 text-center">
            {t('landing.footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  )
}
