# Description
generic way of exucting concurrent commands based on information of your cloud (currently AWS)

# Installation
`npm install -g cloudrunner`

# Usage
## Export your aws credentials
```
export AWS_ACCESS_KEY=<your access key>
export AWS_SECRET_ACCESS_KEY=<your secret key>
```
## Example usage
Note: if any of the commands the run will end!

### Show ip of all members of elb
```
cloudrunner run --select-lb-members <the-elb-name> 'echo {{{ ip }}}'
```

### Show ip of all members of elb per 5 host
```
cloudrunner run --select-lb-members <the-elb-name> --concurrency 5 'echo {{{ ip }}}' 
```

### Show Name of all vms with a name prefix
```
cloudrunner run --select-name-prefix production-frontend 'echo {{{ name }}}'
```

## Print hostname of all vms by ssh in vm
```
cloudrunner run --select-name-prefix production-frontend 'ssh ubuntu@{{{ name }}}'
```

## Curl to webpages on all vms
```
cloudrunner run --select-name-prefix production-frontend 'curl -I http://{{{ name }}}'
```

## Curl to webpages on all vms (but test one) first
```
cloudrunner run --canary 1 --concurrency 5 --select-name-prefix production-frontend 'curl -I http://{{{ name }}}'
```

## Help
```

 Usage: run [options] <command>

 Options:

   -h, --help                     output usage information
   --verify [command]             Command to verify
   -c,--concurrency [number]      Number of concurrent executions
   --canary [number]              Number of canary executions
   --provider                     Cloud Provider (default=aws)
   --aws-region [region]          AWS Region (default=eu-west-1)
   --namespace [namespace]        namespace for names
   --aws-access-key [key]         AWS Access Key
   --aws-secret-access-key [key]  AWS Secret Access Key
   --select-lb-members [elbname]  Select vms that are member of ELB
   --select-name-prefix [prefix]  Select vms where name begins with prefix
   --select-ids [ids]             Select vms where the id matches (Comma Separated)
   --select-ips [ips]             Select vms where the ips matches (Comma Separated)
```
