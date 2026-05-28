import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { getMessages } from './messages';

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'id';

    return {
        locale,
        messages: await getMessages(locale)
    };
});
