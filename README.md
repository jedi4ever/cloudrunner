# Description
generic way of exucting commands based on information of your cloud (currently AWS)

# Installation
```npm install cloudrunner```

# Usage
## Export your aws credentials
```
export AWS_ACCESS_KEY=<your access key>
export AWS_SECRET_ACCESS_KEY=<your secret key>
```

##
```
  Usage: cloudrunner [options] [command]

  Commands:

    run [options] <command> run a command on all instances of an elb
    vms [options]          lists vms
    lbs [options]          lists loadbalancers

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

```
  Usage: run [options] <command>

  Options:

    -h, --help                     output usage information
    --verify [command]             Command to verify
    -c,--concurrency [number]      Number of concurrent executions
    --canary [number]              Number of canary executions
    --provider                     Cloud Provider
    --aws-region [region]          AWS Region
    --namespace [namespace]        namespace for names
    --aws-access-key [key]         AWS Access Key
    --aws-secret-access-key [key]  AWS Secret Access Key
    --select-lb-members [elbname]  Select vms that are member of ELB
    --select-name-prefix [prefix]  Select vms where name begins with prefix
    --select-ids [ids]             Select vms where the id matches (Comma Separated)
    --select-ips [ips]             Select vms where the ips matches (Comma Separated)
```

```
  Usage: lbs [options]

  Options:

    -h, --help                     output usage information
    --aws-region [region]          AWS Region
    --aws-access-key [key]         AWS Access Key
    --aws-secret-access-key [key]  AWS Secret Access Key
    --select-lb-members [elbname]  Select vms that are member of ELB
    --select-name-prefix [prefix]  Select vms where name begins with prefix
    --select-ids [ids]             Select vms where the id matches (Comma Separated)
    --select-ips [ips]             Select vms where the ips matches (Comma Separated)
```

```
  Usage: vms [options]

  Options:

    -h, --help                     output usage information
    --aws-region [region]          AWS Region
    --aws-access-key [key]         AWS Access Key
    --aws-secret-access-key [key]  AWS Secret Access Key
    --select-lb-members [elbname]  Select vms that are member of ELB
    --select-name-prefix [prefix]  Select vms where name begins with prefix
    --select-ids [ids]             Select vms where the id matches (Comma Separated)
    --select-ips [ips]             Select vms where the ips matches (Comma Separated)
```
