# X Agent WebUI

这是一个基于[crawler_on_airflow](https://github.com/claude89757/crawler_on_airflow)项目的前端应用程序。该应用程序为在Airflow上运行的网络爬虫任务提供了用户界面，用于管理和可视化。

## 项目结构

```
.
├── public            # 静态资源文件
├── src               # 源代码目录
│   ├── api           # API请求相关
│   ├── components    # 组件目录
│   │   ├── common    # 通用组件
│   │   ├── dashboard # 仪表盘组件
│   │   ├── data      # 数据相关组件
│   │   └── jobs      # 任务相关组件
│   ├── context       # React上下文
│   ├── lib           # 工具库
│   ├── pages         # 页面组件
│   │   └── auth      # 认证相关页面
│   └── services      # 服务
```

## 可用脚本

在项目目录中，你可以运行：

### `npm start`

在开发模式下运行应用。\
打开 [http://localhost:3000](http://localhost:3000) 在浏览器中查看。

当你进行编辑时，页面将会重新加载。\
你还会在控制台中看到任何lint错误。

### `npm test`

以交互式监视模式启动测试运行器。\
有关更多信息，请参阅[运行测试](https://facebook.github.io/create-react-app/docs/running-tests)。

### `npm run build`

将用于生产的应用程序构建到`build`文件夹。\
它在生产模式下正确地打包React，并优化构建以获得最佳性能。

构建被压缩，文件名包含哈希值。\
你的应用已准备好部署！

有关更多信息，请参阅[部署](https://facebook.github.io/create-react-app/docs/deployment)。

### `npm run eject`

**注意：这是一个单向操作。一旦你`eject`，就不能回去了！**

如果你对构建工具和配置选择不满意，可以随时`eject`。此命令将从你的项目中删除单个构建依赖项。

相反，它会将所有配置文件和传递依赖项（webpack、Babel、ESLint等）复制到你的项目中，以便你完全控制它们。除了`eject`之外的所有命令仍然可以工作，但它们将指向复制的脚本，因此你可以调整它们。此时你就要靠自己了。

你不必使用`eject`。精选的功能集适用于中小型部署，你不应该觉得有义务使用此功能。但我们知道，如果你在准备好时无法自定义它，这个工具将不会有用。

## 了解更多

你可以在[Create React App文档](https://facebook.github.io/create-react-app/docs/getting-started)中了解更多信息。

要学习React，请查看[React文档](https://reactjs.org/)。
