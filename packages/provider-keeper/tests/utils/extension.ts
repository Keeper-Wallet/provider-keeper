import { createWriteStream, unlinkSync } from 'fs';
import { get } from 'https';

export default class Extension {
    id: string;
    path?: string;

    constructor(id: string) {
        this.id = id;
    }

    getUrl = (): string => {
        return (
            'https://clients2.google.com/service/update2/crx?' +
            'response=redirect' +
            '&os=mac' +
            '&arch=x86-64' +
            '&os_arch=x86-64' +
            '&nacl_arch=x86-64' +
            '&prod=chromecrx' +
            '&prodchannel=unknown' +
            '&prodversion=93.0.4577.63' +
            '&acceptformat=crx2,crx3' +
            '&x=id%3D' +
            this.id +
            '%26uc'
        );
    };

    saveTo = async (path) => {
        let cls = this;

        return new Promise<void>((resolve) => {
            get(this.getUrl(), (response) => {
                if (response.statusCode === 302) {
                    get(response.headers.location!, (response) => {
                        let file = createWriteStream(path);
                        response.pipe(file);
                        cls.path = path;
                        file.on('finish', resolve);
                    });
                }
            });
        });
    };

    destroy = () => {
        if (this.path) {
            unlinkSync(this.path);
            delete this.path;
        }
    };
}
