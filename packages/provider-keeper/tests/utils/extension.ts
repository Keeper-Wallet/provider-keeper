import { get } from 'https';

export default async function fetchById(id: string): Promise<string> {
    const url =
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
        id +
        '%26uc';

    return new Promise<string>((resolve, reject) => {
        let body = '';

        get(url, (response) => {
            if (response.statusCode === 302) {
                get(response.headers.location!, (response) => {
                    response.setEncoding('base64');
                    response
                        .on('data', (chunk) => {
                            body += chunk;
                        })
                        .on('end', () => {
                            resolve(body);
                        })
                        .on('error', (err) => {
                            reject(err);
                        });
                });
            }
        });
    });
}
