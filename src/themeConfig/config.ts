import { ThemeConfig } from 'antd';

const theme = {
    colorLink: 'rgba(248,213,126,1)',
    colorLinkHover: 'rgba(248,213,126,1)',
    colorLinkActive: 'rgba(248,213,126,1)',
    colorPrimary: 'rgba(248, 213, 126, 1)',
    colorPrimaryHover: 'rgba(245, 196, 82, 1)',
    colorPrimaryActive: 'rgba(242, 180, 45, 1)',
}

const config: ThemeConfig = {
    token: theme,
    components: {
        Pagination: {
            itemActiveBg: 'rgba(248,213,126,1)',
            colorPrimary: 'rgba(255,255,255,1)',
            colorPrimaryHover: 'rgba(255,255,255,1)',
        }
    }
}
export default config;