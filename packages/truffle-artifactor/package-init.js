// Browser environment
if(typeof window !== 'undefined') {
    Pudding = (typeof window.Pudding !== 'undefined') ? window.Pudding : require('ether-pudding');
}
