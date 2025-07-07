import { ThemeConfig } from 'antd';

const theme = {
    colorLink: 'rgba(131, 137, 252, 1)',
    colorLinkHover: 'rgba(131, 137, 252, 1)',
    colorLinkActive: 'rgba(131, 137, 252, 1)',
    // colorPrimary: 'rgba(248, 213, 126, 1)',
    colorPrimary: 'rgba(131, 137, 252, 1)',
    colorPrimaryHover: 'rgba(131, 137, 252, 1)',
    colorPrimaryActive: 'rgba(131, 137, 252, 1)',
}

const config: ThemeConfig = {
    token: theme,
    components: {
        Pagination: {
            itemActiveBg: 'rgba(131, 137, 252, 1)',
            colorPrimary: 'rgba(255,255,255,1)',
            colorPrimaryHover: 'rgba(255,255,255,1)',
        }
    }
}
export default config;