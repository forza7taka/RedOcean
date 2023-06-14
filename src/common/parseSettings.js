import { ref } from 'vue'
import Parse from "parse"
import { useStorage } from '@vueuse/core'
// import { Setting } from 'setting'

export function useParseSettings() {

    async function upload() {
        // const user = ref(null)
        const settings = ref(null)
        useStorage('redocean', settings)
        if (!settings.value) {
            return
        }
        const current = Parse.User.current();
        if (!current) {
            return
        }
        current.setACL(new Parse.ACL(current));

        const Setting = Parse.Object.extend("setting");
        const settingQuery = new Parse.Query(Setting);
        settingQuery.equalTo("userId", current.id);
        let setting = await settingQuery.first();
        if (!setting) {
            setting = new Setting();
        }
        setting.setACL(new Parse.ACL(Parse.User.current()));
        setting.set("translationApiKey", settings.value.translationApiKey)
        setting.set("translationLang", settings.value.translationLang)
        setting.set("handed", settings.value.handed)
        setting.set("userId", current.id)
        setting.save()

        const AccountSetting = Parse.Object.extend("accountSetting");
        const map = new Map()
        for (let i = 0; i < settings.value.users.length; i++) {
            const u = settings.value.users[i]
            const accountSettingQuery = new Parse.Query(AccountSetting);
            accountSettingQuery.equalTo("did", u.did);
            let accountSetting = await accountSettingQuery.first();
            if (!accountSetting) {
                accountSetting = new AccountSetting();
            }
            accountSetting.setACL(new Parse.ACL(Parse.User.current()));
            accountSetting.set("server", u.server)
            accountSetting.set("did", u.did)
            accountSetting.set("handle", u.handle)
            accountSetting.set("avatar", u.avatar)
            accountSetting.set("color", u.color)
            if (u.push) {
                setting.set("push.enable", u.push.enable)
                setting.set("push.enableFollowed", u.push.enableFollowed)
                setting.set("push.enableReposted", u.push.enableReposted)
                setting.set("push.enableReplied", u.push.enableReplied)
                setting.set("push.enableLiked", u.push.enableLiked)
                setting.set("push.enableMention", u.push.enableMention)
            }
            accountSetting.set("parent", setting);
            accountSetting.save()
            map.set(u.did, u.did)
        }

        const accountSettingQuery = new Parse.Query(AccountSetting);
        accountSettingQuery.equalTo("parent", setting.id);
        const accountSettings = await accountSettingQuery.find();
        for (let i = 0; i < accountSettings.length; i++) {
            const accountSetting = accountSettings[i];
            if (map.get(accountSetting.get("did"))) {
                continue
            }
            accountSetting.destroy();
        }

        const LabelsSetting = Parse.Object.extend("labelsSetting");
        const labelsSettingQuery = new Parse.Query(LabelsSetting);
        labelsSettingQuery.equalTo("parent", setting.id);
        const labelsSettings = await labelsSettingQuery.find();
        for (let i = 0; i < labelsSettings.length; i++) {
            labelsSettings[i].destroy();
        }

        for (let i = 0; i < settings.value.users.length; i++) {
            const u = settings.value.users[i]
            if (!u.labels) {
                continue
            }
            for (let j = 0; j < u.labels.length; j++) {
                const label = u.labels[j]
                const labelsSetting = new LabelsSetting();
                labelsSetting.setACL(new Parse.ACL(Parse.User.current()));
                labelsSetting.set("did", u.did)
                labelsSetting.set("labelId", label.id)
                labelsSetting.set("value", label.value)
                labelsSetting.set("parent", setting);
                labelsSetting.save()
            }
        }
    }

    async function download() {
        const user = ref([{ did: null, server: null, handle: null, avatar: null, color: null, labels: null }])
        const settings = ref({
            translationApiKey: null,
            translationLang: null,
            handed: true,
            users: user
        })
        const storageSettings = useStorage('redocean', settings)

        const u = Parse.User.current();
        if (!u) {
            return
        }
        u.setACL(new Parse.ACL(u));

        const Setting = Parse.Object.extend("setting");
        const query = new Parse.Query(Setting);
        query.equalTo("userId", u.id);
        const object = await query.first();
        if (!object) {
            return
        }
        settings.value.translationApiKey = object.get("translationApiKey")
        settings.value.translationLang = object.get("translationLang")
        settings.value.handed = object.get("handed")

        const AccountSetting = Parse.Object.extend("accountSetting");
        const query2 = new Parse.Query(AccountSetting);
        query2.equalTo("parent", object.id);
        const results2 = await query2.find();
        settings.value.users = []
        for (let i = 0; i < results2.length; i++) {
            settings.value.users.push({
                did: results2[i].get("did"),
                server: results2[i].get("server"),
                handle: results2[i].get("handle"),
                avatar: results2[i].get("avatar"),
                labels: null,
                color: results2[i].get("color"),
                push: {
                    enable: results2[i].get("push.enable"),
                    enableFollowed: results2[i].get("push.enableFollowed"),
                    enableReposted: results2[i].get("push.enableReposted"),
                    enableReplied: results2[i].get("push.enableReplied"),
                    enableLiked: results2[i].get("push.enableLiked"),
                    enableMention: results2[i].get("push.enableMention")
                }
            })
        }
        const LabelsSetting = Parse.Object.extend("labelsSetting");
        const query3 = new Parse.Query(LabelsSetting);
        query3.equalTo("parent", object.id);
        const results3 = await query3.find();
        for (let i = 0; i < settings.value.users.length; i++) {
            if (!settings.value.users[i].labels) {
                settings.value.users[i].labels = []
            }
            for (let j = 0; j < results3.length; j++) {
                if (results3[j].get("did") != settings.value.users[i].did) {
                    continue
                }
                settings.value.users[i].labels.push({
                    id: results3[j].get("labelId"),
                    value: results3[j].get("value")
                })
            }
        }
        storageSettings.value = settings.value
    } return { upload, download }

}
