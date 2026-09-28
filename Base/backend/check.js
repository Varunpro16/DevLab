const k8s = require('@kubernetes/client-node');
const kc = new k8s.KubeConfig();
kc.loadFromDefault(); // Don't forget this line if running locally

const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);



const createPod = async (template, projectName) => {
  
    await k8sApi.readNamespacedDeploymentStatus({name:"varun-deployment",namespace:"default"}).then(e => {
        console.log("found");
        
    }).catch((e)=>{
        console.log("not found");
        
    })
  
}

createPod("react","varun")